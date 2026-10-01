import Joi from 'joi';
import { Evaluation } from '../models/Evaluation.js';

const createSchema = Joi.object({
  seminarCode: Joi.string().required(),
  score: Joi.number().min(1).max(5).required(),
  comment: Joi.string().allow('').optional(),
  evaluatedBy: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
});

// GET /api/evaluations
export async function getAllEvaluations(req, res, next) {
  try {
    const evaluations = await Evaluation.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ evaluations });
  } catch (err) { next(err); }
}

// GET /api/evaluations/:id
export async function getEvaluation(req, res, next) {
  try {
    const evaluation = await Evaluation.findById(req.params.id);
    if (!evaluation) return res.status(404).json({ message: 'Evaluation not found' });
    res.status(200).json({ evaluation: evaluation.toObject ? evaluation.toObject() : evaluation });
  } catch (err) { next(err); }
}

// POST /api/evaluations
export async function createEvaluation(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ message: error.message });

    const evaluation = await Evaluation.create({
      ...value,
      evaluatedBy: value.evaluatedBy ? value.evaluatedBy : undefined
    });

    res.status(201).json({ evaluation: evaluation.toObject ? evaluation.toObject() : evaluation });
  } catch (err) { next(err); }
}

// GET /api/evaluations/summary?seminarCode=SM101
export async function getEvaluationSummary(req, res, next) {
  try {
    const { seminarCode } = req.query;

    if (!seminarCode || !String(seminarCode).trim()) {
      return res.status(400).json({ message: 'seminarCode is required' });
    }

    const [result] = await Evaluation.aggregate([
      { $match: { seminarCode: String(seminarCode) } },
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$score' },
          evaluationCount: { $sum: 1 }
        }
      }
    ]);

    if (!result) {
      return res.status(200).json({ seminarCode: String(seminarCode), averageScore: 0, evaluationCount: 0 });
    }

    res.status(200).json({
      seminarCode: String(seminarCode),
      averageScore: Number(result.averageScore),
      evaluationCount: Number(result.evaluationCount)
    });
  } catch (err) { next(err); }
}
