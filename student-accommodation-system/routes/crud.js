const express = require('express');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const RESERVED = new Set(['q', 'page', 'limit', 'sortBy', 'order']);
const HIDDEN = new Set(['_id', 'createdAt', 'updatedAt', '__v']);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Builds a full CRUD router for one collection.
 *   GET    /          list (search, filter, sort, pagination)
 *   GET    /:id       read one
 *   POST   /          create (ID auto-generated when omitted)
 *   PUT    /:id       update
 *   DELETE /:id       delete
 */
function crudRouter({ Model, idField, prefix, searchFields, validate, beforeDelete, afterChange }) {
  const router = express.Router();
  const schemaKeys = Object.keys(Model.schema.paths).filter((k) => !HIDDEN.has(k));

  const pick = (body) => {
    const out = {};
    for (const k of schemaKeys) if (body[k] !== undefined) out[k] = body[k];
    return out;
  };

  async function nextId() {
    const last = await Model.findOne({ [idField]: new RegExp(`^${prefix}\\d+$`) })
      .collation({ locale: 'en', numericOrdering: true })
      .sort({ [idField]: -1 }).select(idField).lean();
    const n = last ? parseInt(last[idField].slice(prefix.length), 10) + 1 : 1;
    return prefix + String(n).padStart(3, '0');
  }

  const findOr404 = async (id) => {
    const doc = await Model.findOne({ [idField]: id });
    if (!doc) throw new HttpError(404, `${Model.modelName} '${id}' not found`);
    return doc;
  };

  // ---------- READ (list) ----------
  router.get('/', wrap(async (req, res) => {
    const { q, page = 1, limit = 10, sortBy, order = 'asc' } = req.query;
    const filter = {};

    for (const [key, val] of Object.entries(req.query)) {
      if (RESERVED.has(key) || typeof val !== 'string' || val === '') continue; // ignores operator-injection objects
      const range = key.match(/^(min|max)_(.+)$/);
      if (range && Model.schema.path(range[2])) {
        filter[range[2]] = { ...filter[range[2]], [range[1] === 'min' ? '$gte' : '$lte']: Number(val) };
      } else if (Model.schema.path(key)) {
        filter[key] = val;
      }
    }
    if (typeof q === 'string' && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = searchFields.map((f) => ({ [f]: rx }));
    }

    const lim = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 200);
    const pg = Math.max(parseInt(page, 10) || 1, 1);
    const sortField = sortBy && Model.schema.path(sortBy) ? sortBy : idField;

    const [data, total] = await Promise.all([
      Model.find(filter)
        .collation({ locale: 'en', numericOrdering: true })
        .sort({ [sortField]: order === 'desc' ? -1 : 1 })
        .skip((pg - 1) * lim).limit(lim).lean(),
      Model.countDocuments(filter),
    ]);
    res.json({ data, total, page: pg, limit: lim, pages: Math.max(Math.ceil(total / lim), 1) });
  }));

  // ---------- READ (one) ----------
  router.get('/:id', wrap(async (req, res) => {
    res.json(await findOr404(req.params.id));
  }));

  // ---------- CREATE ----------
  router.post('/', wrap(async (req, res) => {
    const data = pick(req.body || {});
    if (!data[idField]) data[idField] = await nextId();
    if (validate) await validate(data, null);
    const doc = await Model.create(data);
    if (afterChange) await afterChange(doc.toObject(), null);
    res.status(201).json(doc);
  }));

  // ---------- UPDATE ----------
  router.put('/:id', wrap(async (req, res) => {
    const existing = await findOr404(req.params.id);
    const previous = existing.toObject();
    const data = { ...previous, ...pick(req.body || {}) };
    data[idField] = previous[idField]; // the business ID is immutable
    if (validate) await validate(data, previous);
    existing.set(pick(data));
    await existing.save();
    if (afterChange) await afterChange(existing.toObject(), previous);
    res.json(existing);
  }));

  // ---------- DELETE ----------
  router.delete('/:id', wrap(async (req, res) => {
    const existing = await findOr404(req.params.id);
    if (beforeDelete) await beforeDelete(existing.toObject());
    await existing.deleteOne();
    if (afterChange) await afterChange(null, existing.toObject());
    res.status(204).end();
  }));

  return router;
}

module.exports = { crudRouter, HttpError };
