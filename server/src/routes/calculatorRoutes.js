'use strict';

const express = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const controller = require('../controllers/calculatorController');

const router = express.Router();

/** Shared field definitions so GET and POST validate identically. */
const principalField = z.coerce
  .number({ required_error: 'Loan amount is required.' })
  .positive('Loan amount must be greater than zero')
  .max(1_000_000_000, 'Loan amount is unrealistically large for this tool');

const rateField = z.coerce
  .number({ required_error: 'Interest rate is required.' })
  .min(0, 'Interest rate cannot be negative')
  .max(60, 'Interest rate must be 60% or less');

const tenureFields = {
  tenureYears: z.coerce.number().positive().max(40).optional(),
  tenureMonths: z.coerce.number().int().positive().max(480).optional(),
};

/** Require at least one of tenureYears / tenureMonths. */
const requireTenure = (schema) =>
  schema.refine((data) => data.tenureYears || data.tenureMonths, {
    message: 'Please provide a loan tenure',
    path: ['tenureYears'],
  });

const emiQuerySchema = requireTenure(
  z.object({ principal: principalField, annualRate: rateField, ...tenureFields }),
);

const emiBodySchema = requireTenure(
  z.object({ principal: principalField, annualRate: rateField, ...tenureFields }),
);

const prepaymentSchema = requireTenure(
  z.object({
    principal: principalField,
    annualRate: rateField,
    ...tenureFields,
    amount: z.coerce.number().positive('Prepayment amount must be greater than zero'),
    afterPeriod: z.coerce.number().int().positive().max(480).default(12),
    strategy: z.enum(['keep-tenure', 'keep-emi']).default('keep-tenure'),
  }),
);

const estimateSchema = z
  .object({
    age: z.coerce.number().int().min(18, 'Age must be at least 18').max(80),
    employmentType: z.enum(['salaried', 'self-employed', 'business']),
    monthlyIncome: z.coerce.number().min(0).max(100_000_000),
    existingEmis: z.coerce.number().min(0).max(100_000_000).default(0),
    creditScore: z.coerce
      .number()
      .int()
      .min(300, 'Credit scores usually range from 300 to 900')
      .max(900, 'Credit scores usually range from 300 to 900'),
    loanAmount: z.coerce.number().min(0).max(1_000_000_000),
    loanType: z.string().trim().max(80).optional(),
  })
  .refine((data) => data.monthlyIncome > 0, {
    message: 'Please enter your monthly income so the estimate can be computed',
    path: ['monthlyIncome'],
  });

router.get('/emi', validate({ query: emiQuerySchema }), controller.calculateEmiHandler);
router.post('/emi', validate({ body: emiBodySchema }), controller.calculateEmiHandler);
router.post('/prepayment', validate({ body: prepaymentSchema }), controller.prepaymentHandler);

/** EDUCATIONAL ESTIMATE — NOT A LOAN APPROVAL DECISION. */
router.post('/eligibility/estimate', validate({ body: estimateSchema }), controller.estimateHandler);

module.exports = router;
