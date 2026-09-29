-- ═══════════════════════════════════════════════════════════════════════
--  AI LOAN INFORMATION ASSISTANT (4SU24CS045) — SEED DATA
--
--  IMPORTANT CONTENT POLICY
--  ────────────────────────
--  • Every entry below is EDUCATIONAL content.
--  • NO specific lender interest rates are stored anywhere in this file.
--    Interest is explained conceptually only, and users are directed to
--    verify live rates with the lender.
--  • Nothing here approves, recommends or guarantees a loan.
-- ═══════════════════════════════════════════════════════════════════════

USE `loan_assistant`;
SET NAMES utf8mb4;

-- NOTE: `scripts/seed.js` truncates the knowledge tables before running this
-- file, so re-seeding is always idempotent. If you run this file directly
-- with the mysql CLI, run the TRUNCATE block below first:
--
--   SET FOREIGN_KEY_CHECKS = 0;
--   TRUNCATE loan_type_documents; TRUNCATE loan_type_terms;
--   TRUNCATE documents; TRUNCATE eligibility_factors;
--   TRUNCATE loan_terms; TRUNCATE loan_types; TRUNCATE faqs;
--   SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════════════════════
--  LOAN TYPES  (6)
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO `loan_types`
(`slug`, `name`, `tagline`, `icon`, `accent`, `what_it_is`, `common_purpose`, `eligibility_summary`, `documents_summary`, `interest_concept`, `tenure_concept`, `repayment_concept`, `key_terminology`, `pros`, `cons`, `sort_order`) VALUES

('personal-loan', 'Personal Loan',
 'Unsecured borrowing for personal needs, repaid in fixed monthly instalments.',
 'Wallet', 'emerald',
 'A personal loan is a fixed-tenure loan given to a person for personal needs. It is normally **unsecured**, meaning no property is kept as security. You receive a lump sum, then repay it in equal monthly instalments (EMI) over an agreed period. Because there is no security, lenders usually charge a higher rate of interest than secured loans, but approval is generally quicker and the process needs fewer documents.',
 'Meeting urgent personal expenses, medical costs, travel, home repairs, wedding expenses or consolidating several existing debts into one manageable EMI.',
 'Lenders usually look at your age, income stability, existing EMIs, credit score and credit history. A salaried person with steady income and few existing obligations is generally in a stronger position. Exact rules differ per lender.',
 'Usually identity proof, address proof, income proof (salary slips or bank statements), and sometimes employment proof. A few lenders also ask for the latest ITR or Form 16.',
 'Interest is charged on the **reducing balance** — the outstanding principal, which falls every month. Interest is highest in the early instalments and decreases over time. The exact rate depends on the lender, your credit profile and market conditions, and rates change frequently, so confirm the current rate with the lender.',
 'Typically a short tenure, such as 1 to 5 years. A shorter tenure means a higher EMI but a lower total interest cost. A longer tenure lowers the EMI but increases total interest.',
 'Repaid through fixed monthly EMIs. Most personal loans allow **foreclosure** (paying off the whole loan early), sometimes with a small fee. Late payment adds penalty interest and can be reported to credit bureaus.',
 '["EMI","Principal","Interest","Unsecured Loan","Foreclosure","Credit Score","Processing Fee"]',
 'No collateral needed; fast approval; flexible use of funds; can consolidate multiple debts into one EMI.',
 'Higher interest than secured loans; usually short tenure; fees and prepayment charges may apply; approval depends heavily on credit score and income proof.',
 1),

('home-loan', 'Home Loan',
 'A long-tenure secured loan where the property is the security until the loan closes.',
 'Home', 'sky',
 'A home loan (also called a housing loan) is a **secured** loan used to buy, build or renovate a property. The property acts as collateral, which is why interest is usually lower than unsecured loans. The loan is repaid over a long tenure, often 15 to 30 years, through fixed monthly EMIs. The amount you can borrow is limited by the property value and your repayment capacity.',
 'Buying a new home, constructing a house on a plot you own, renovating or repairing an existing property, or balancing a previous home loan by taking a top-up.',
 'Lenders usually assess your age, monthly income, existing debts, credit score, job stability and the value of the property. The loan amount is generally a portion of the property value, and the lender may also require part of the purchase amount as down payment from your own funds.',
 'Identity proof, address proof, income proof, employment proof, and property documents such as the sale deed or agreement, approved plan, tax receipts, occupancy or completion certificate, plus the latest property tax receipt.',
 'Interest is charged on the reducing balance over a long period, so the total interest cost is much higher than the principal. Home loans are usually offered at a **floating rate linked to an external benchmark** (such as a repo-linked rate). The rate can go up or down with the market, so verify the current rate and the reset frequency with the lender.',
 'The longest tenure of any common retail loan, typically 15 to 30 years. Tenure should ideally be as short as you can comfortably afford, because a longer tenure means far more total interest.',
 'Long fixed monthly EMIs. Most home loans allow **part-prepayment** and **foreclosure** after a lock-in period. Missing EMIs can lead to penalty interest, and sustained default can result in the lender invoking the property security — this is a serious legal step, not an automatic one.',
 '["Collateral","Secured Loan","Loan-to-Value Ratio","EMI","Amortization","Part-Prepayment","Foreclosure","Moratorium"]',
 'Lower interest because of security; very long tenure so the EMI stays affordable; possible tax benefits (verify current rules); usually the highest ticket amount.',
 'Very long tenure means a huge total interest cost; property is held as security; documentation for property and income is heavy; legal checks take time.',
 2),

('education-loan', 'Education Loan',
 'Financing higher education, usually secured by the property being purchased.',
 'GraduationCap', 'violet',
 'An education loan funds higher education — undergraduate, postgraduate, professional or overseas studies. It can cover tuition fees, hostel and travel expenses, and sometimes books and equipment, either by paying the institution directly or by crediting the amount to the borrower''s account. It is usually a **secured** loan backed by the property being purchased, which often allows a longer tenure and a lower interest cost. Education loans may have a **moratorium** period during which repayment does not begin.',
 'Tuition fees at a college or university, hostel and mess expenses, travel to and from the institution, books and equipment, and in some cases a gap year or job placement period.',
 'Lenders look at the academic record of the course, age of the student, income and affordability of the co-applicant (usually a parent or guardian), the institution and course type, and credit history of the co-applicant when the student is a minor.',
 'Academic records such as marksheets and admission proof, identity and address proof of the student and co-applicant, income proof of the co-applicant, bank statements, and property or fixed-deposit documents used as security.',
 'Interest accrues on the outstanding principal. Many lenders offer a concessional interest rate for eligible courses, but these schemes change over time and depend on the institution and course, so check the current terms with the lender. Interest generally starts after the moratorium or after the course ends, depending on the scheme.',
 'A relatively long tenure, because a student typically has no income initially. A longer tenure keeps the EMI small after repayment begins, but increases total interest.',
 'Repayment usually starts after the course ends or after a moratorium period. **Prepayment** during the course is generally restricted. After repayment begins, EMIs follow the same reducing-balance structure as other loans.',
 '["Moratorium","Co-applicant","Secured Loan","EMI","Tenure","Prepayment","Concessional Rate"]',
 'Covers costs a family may not have liquid cash for; covers multiple expense heads; possible interest concession for eligible courses; usually no repayment pressure during study.',
 'Must be serviced after graduation; interest cost is high if the course does not lead to income; security is usually required; course and institution eligibility rules apply.',
 3),

('vehicle-loan', 'Vehicle Loan',
 'Secured financing for buying a new or used vehicle, repaid over a medium tenure.',
 'Car', 'amber',
 'A vehicle loan (auto loan) finances the purchase of a new or used car, two-wheeler, or sometimes a commercial vehicle. The vehicle itself is the **collateral** — the lender holds the vehicle registration and keeps the right to repossess if the loan is severely defaulted. It is repaid through fixed monthly EMIs over a medium tenure. New and used vehicles have different conditions and pricing, and used-vehicle loans are usually shorter in tenure.',
 'Buying a new vehicle, buying a used vehicle, replacing an old vehicle, or financing a commercial vehicle for business use.',
 'Lenders usually assess the applicant''s income and employment stability, existing EMIs, credit score, and the vehicle''s age and valuation for used vehicles. Lenders also set limits based on the vehicle''s ex-showroom or market value.',
 'Identity proof, address proof, income proof, employment proof, vehicle quotation or invoice, and existing vehicle registration and insurance documents when refinancing.',
 'Interest is charged on the reducing balance of the vehicle loan. The rate depends on the lender, the vehicle type, whether it is new or used, and the applicant''s credit profile. Used-vehicle loans often attract a higher rate because the asset depreciates faster. Rates change, so verify with the lender.',
 'Usually shorter than a home loan, often 3 to 7 years, because a vehicle depreciates and lenders prefer a shorter exposure. A shorter tenure keeps total interest lower but the EMI higher.',
 'Fixed monthly EMIs until the tenure ends. The lender holds the vehicle registration certificate (RC) until final closure. **Foreclosure** is usually permitted, sometimes after a minimum period. Missing EMIs can lead to recovery and, in severe cases, repossession of the vehicle.',
 '["Collateral","EMI","Secured Loan","Outstanding Balance","Foreclosure","Loan-to-Value Ratio","Hypothecation"]',
 'Vehicle is the security, so interest is lower than unsecured loans; quick approval since the asset is identified; new-car loans can have longer tenure.',
 'Vehicle depreciates quickly, so the outstanding principal can exceed market value if the loan is long; used-vehicle loans have higher rates and shorter tenure; late payment can lead to repossession.',
 3),

('business-loan', 'Business Loan',
 'Funding for a business, with secured and unsecured options depending on the lender.',
 'Briefcase', 'indigo',
 'A business loan (also called MSME or working-capital loan) provides funds to a business for growth or day-to-day operations. It may be **secured** against property or equipment, or **unsecured** when the business has a strong track record. Funds can be used for stock, equipment, expansion, payroll or to smooth out cash flow. Some forms are revolving working-capital limits and some are term loans repaid in fixed instalments.',
 'Working capital, purchasing stock or raw materials, buying equipment, opening a new branch, payroll, and consolidating business debt.',
 'Lenders assess business vintage (how long it has operated), turnover and profitability, the nature of the industry, the proprietor''s personal credit profile, existing business and personal debts, and the availability of collateral for secured variants.',
 'Business registration documents such as GST registration and MSME/Udyam registration, income tax returns and business financial statements, bank statements, business licence, KYC of the proprietor or partners, and property or equipment documents for secured loans.',
 'Interest may be charged on the reducing balance for term loans, or on the amount actually utilised for revolving limits. Secured business loans are usually cheaper than unsecured ones. Business rates vary widely by lender, industry risk and the borrower''s credit profile, and they change — confirm the current rate with the lender.',
 'Term loans usually run 1 to 5 years. Revolving working-capital limits are renewed periodically rather than closed after a fixed number of instalments.',
 'Term loans are repaid in fixed EMIs. Revolving limits are repaid when the limit is reduced or renewed. **Foreclosure** on a term loan is usually allowed, sometimes with a fee. Late payment affects both the business credit record and the proprietor''s personal credit score.',
 '["Working Capital","Secured Loan","Unsecured Loan","EMI","Cash Flow","Overdraft","Foreclosure"]',
 'Can be structured around business cash flow; secured option is comparatively cheaper; possible tax benefits (verify current rules); grows with the business.',
 'Requires continuous, verifiable business income; paperwork is heavier than personal loans; personal credit score is often checked; default can affect both personal and business credit.',
 4),

('gold-loan', 'Gold Loan',
 'Quick, short-tenure borrowing secured by gold jewellery or bullion.',
 'Gem', 'yellow',
 'A gold loan lets you borrow money by keeping gold jewellery, coins or bullion as **collateral**. It is one of the quickest forms of borrowing because the asset is already in your possession and can be valued immediately. It is usually a short-tenure loan of 3 to 12 months, repaid as a lump sum or in instalments. The amount you receive is a percentage of the value of the gold, decided by the lender after testing purity and weight. Loans against gold ornaments typically must be repaid before the jewellery is released.',
 'Emergency funds, medical expenses, education or business needs, or short-term cash requirements when other credit is unavailable.',
 'Eligibility is usually based on the **value and purity of the gold**, not on your income or credit score. Most lenders also ask for valid identity proof, a copy of the gold ornaments, and sometimes proof of ownership. A few lenders may also assess income for larger amounts.',
 'Identity proof, address proof, photograph of the gold items to be pledged, and ownership proof. Some lenders ask for a valuation certificate.',
 'Interest is charged on the amount borrowed, and the rate depends on the lender, the purity of the gold and market conditions. Gold-loan rates change frequently, so verify the current rate with the lender. The lender also charges a valuation or storage charge, and the amount offered is a percentage of gold value that changes with market prices.',
 'Very short tenure, usually 3 to 12 months. Tenure is short because gold prices can move, and the lender wants the loan closed quickly.',
 'Repaid as a lump sum at the end of the tenure or in monthly instalments, depending on the lender. If the loan is not repaid, the gold may be auctioned to recover the amount. Always ask for a proper receipt and a clear return date for your jewellery.',
 '["Collateral","Secured Loan","Purity","Hallmarking","Outstanding Balance","Foreclosure","Auction"]',
 'Quick disbursal; minimal income proof needed; no income documentation stress; can be used in emergencies.',
 'Very short tenure; interest can accumulate quickly if extended; gold items are held by the lender; risk of auction if not repaid.',
 5);

-- ═══════════════════════════════════════════════════════════════════════
--  LOAN TERMS (glossary) — 26 entries
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO `loan_terms`
(`slug`, `term`, `category`, `short_definition`, `detailed_explanation`, `example`, `related_terms`, `why_it_matters`, `is_featured`, `sort_order`) VALUES

('emi', 'EMI (Equated Monthly Instalment)', 'Repayment',
 'The fixed monthly payment a borrower makes toward a loan, covering both principal and interest.',
 'EMI stands for **Equated Monthly Instalment**. It is the fixed amount you pay every month for the duration of the loan, called the **tenure**. Each EMI is split into two parts: the **interest** charged on the outstanding principal for that month, and the **principal** repayment that reduces what you still owe. As the outstanding principal falls, the interest portion of each EMI falls and the principal portion rises. The EMI itself usually stays the same for the whole tenure, which is what makes it predictable. The exact EMI is calculated using a standard formula: **EMI = P x r x (1+r)^n / ((1+r)^n - 1)**, where P is the principal, r is the monthly interest rate, and n is the number of monthly instalments. Some loans may be structured as a floating-rate EMI, where the EMI changes when the underlying rate changes.',
 'You borrow 500,000 at 12% per year for 3 years. The monthly rate is 12/12/100 = 1%, and n = 36. The EMI works out to about 16,608. Of the first EMI, roughly 5,000 is interest and the rest reduces the principal. By the last EMI, almost the entire payment goes toward principal.',
 '["Principal","Interest","Tenure","Amortization","Outstanding Balance"]',
 'Your EMI must comfortably fit your monthly budget. A lower EMI means a longer tenure, which means more total interest.',
 1, 1),

('principal', 'Principal', 'Basic',
 'The original amount borrowed, and the part of your EMI that actually reduces the amount you owe.',
 'The **principal** is the loan amount the lender actually gives you. Every EMI you pay contains a principal component, and these small portions gradually reduce the outstanding principal until it reaches zero at the end of the tenure. Early in the tenure, most of your EMI goes toward interest and only a small part reduces the principal. As time passes, the split shifts and more of each EMI goes toward principal. This is why paying off a loan earlier saves a lot of interest — the remaining principal is what the interest was being calculated on.',
 'You borrow 200,000. The principal is 200,000. After a year of EMIs you may have reduced the principal to about 170,000; that remaining 170,000 is the **outstanding principal** on which the next month''s interest is charged.',
 '["EMI","Interest","Outstanding Balance","Amortization","Prepayment"]',
 'Interest is always calculated on the outstanding principal, so reducing the principal early directly reduces your future interest cost.',
 1, 2),

('interest', 'Interest', 'Interest',
 'The cost the lender charges for lending you money, calculated as a percentage of the outstanding principal.',
 '**Interest** is the price of borrowing money. It is usually expressed as an annual percentage rate. The amount you pay as interest is not on the original loan amount for the whole tenure — it is calculated on the **reducing balance**, meaning the outstanding principal that reduces with every EMI. Because of this, the interest portion of your EMI is highest at the beginning and lowest at the end. The total interest you pay is strongly influenced by the rate and the tenure: a small increase in either can make the total cost far higher. Lenders may also charge interest on a floating basis linked to a benchmark, in which case your EMI can change when the benchmark changes.',
 'On a 300,000 loan at 10% per year, the first month''s interest is about 2,500. Two years later, when the outstanding principal is much lower, the monthly interest is noticeably smaller. Over the full tenure the total interest can exceed the original principal.',
 '["Interest Rate","Principal","Reducing Balance","EMI","Total Interest"]',
 'Interest is often the largest cost of a loan. Understanding how it is calculated helps you see why a longer tenure costs more overall.',
 1, 3),

('interest-rate', 'Interest Rate', 'Interest',
 'The percentage rate used to calculate the interest charged on a loan.',
 'The **interest rate** is the percentage applied to the outstanding principal to work out the interest cost. It is normally quoted per year, but monthly EMIs use the monthly rate, which is the annual rate divided by 12. Lenders also express rates in different ways — for example a **nominal rate**, a **reducing balance rate**, or an **effective rate**. The effective rate is the more honest comparison because it includes fees. Rates vary by lender, loan type, the applicant''s credit profile, the security offered and market conditions. They also change over time, so always verify the current rate directly with the lender. This project deliberately stores no specific lender rates for exactly this reason.',
 'A loan advertised at 10% per year with no charges costs less in total than one advertised at 9.5% but with a high processing fee. Comparing the effective rate, not just the headline rate, gives the true picture.',
 '["Interest","Effective Rate","Processing Fee","Credit Score","Floating Rate"]',
 'Rate and tenure together decide your total interest cost. A small rate difference over many years becomes a large amount of money.',
 1, 4),

('tenure', 'Loan Tenure', 'Basic',
 'The total time, in months or years, over which a loan is repaid.',
 'The **tenure** is how long you take to repay the loan completely. A longer tenure means a smaller EMI each month, but you pay interest for more months, so the total interest cost is much higher. A shorter tenure means a bigger EMI but a much lower total cost. Choosing tenure is therefore a balance between monthly affordability and lifetime cost. Lenders set a minimum and maximum tenure for each loan type, and the maximum usually depends on the borrower''s age at the end of the tenure.',
 'On a 2,000,000 home loan, a 20-year tenure gives a lower EMI than a 30-year tenure. The 30-year option is easier on your monthly budget but adds roughly a decade of extra interest.',
 '["EMI","Amortization","Prepayment","Moratorium"]',
 'Tenure is one of the biggest levers on total interest. A slightly higher EMI for a shorter tenure can save a large amount overall.',
 1, 5),

('processing-fee', 'Processing Fee', 'Fees',
 'A one-time charge some lenders collect for processing a loan application, documentation and disbursal.',
 'A **processing fee** is a one-time charge levied by many lenders to cover the cost of verifying documents, checking property or collateral, processing the application and disbursing the loan. It is usually a percentage of the loan amount or a flat fee, and in many products it is deducted from the amount disbursed rather than charged separately. Some lenders also charge for **legal**, **valuation** or **prepayment/foreclosure**. Because of this, two loans with the same advertised rate can have very different real costs, which is why the **effective rate** is the fair way to compare them. Fee structures differ per lender and change over time — verify the complete fee list with the lender before you sign.',
 'On a 1,000,000 loan, a 1% processing fee means 10,000 is deducted, so the amount credited to your account is 990,000 even though the EMI is calculated on 1,000,000.',
 '["Interest Rate","Effective Rate","Foreclosure","Prepayment"]',
 'Fees are part of the true cost of borrowing. Two loans with the same rate can differ greatly once fees are counted.',
 0, 6),

('credit-score', 'Credit Score', 'Credit',
 'A number summarising your creditworthiness, generated from your credit repayment history.',
 'A **credit score** is a summary number calculated from your credit history — how you have repaid past loans and credit-card balances, how long your accounts have existed, and how much of your available credit you use. In India this is commonly reported by credit bureaus such as CIBIL, Experian, Equifax and CRISIL on a scale roughly from 300 to 900. A higher score generally indicates more consistent repayment behaviour. Lenders use the score as one of several inputs, together with income, existing debts and job stability, when assessing an application. A higher score can help you negotiate better terms. Scores change over time and improve when you keep EMIs and card bills on time and keep credit utilisation low.',
 'Someone with EMIs and card payments always on time and low card usage builds a stronger score over a few years, which typically makes it easier to obtain a loan and to negotiate a lower rate.',
 '["Credit History","Debt-to-Income Ratio","Default","Late Payment","Collateral"]',
 'Your credit score influences both whether a lender will consider you and the terms you may get, so it is worth monitoring.',
 1, 7),

('collateral', 'Collateral', 'Security',
 'An asset kept by the lender as security until the loan is fully repaid.',
 '**Collateral** is a property, vehicle, gold item or other asset that a lender holds until you repay the loan. A loan backed by collateral is a **secured loan**. Because the lender has something to recover from if you default, it can usually offer a lower interest rate and a longer tenure. If the loan is severely defaulted and remains unpaid even after notices, the lender may take legal steps to sell the collateral and recover the dues. Collateral must be valued and, for property, usually formally documented and registered.',
 'For a home loan, the property being purchased is the collateral. If EMIs stop for a long period despite notices, the lender may initiate legal recovery through the property.',
 '["Secured Loan","Unsecured Loan","Loan-to-Value Ratio","Foreclosure","Auction"]',
 'Collateral is the reason secured loans are usually cheaper, and it is also what the lender may look to if you stop paying.',
 1, 8),

('secured-loan', 'Secured Loan', 'Security',
 'A loan backed by an asset (collateral) that the lender can claim if you default.',
 'In a **secured loan**, the lender holds an asset as security for the amount borrowed. Because the lender can recover the amount from that asset, secured loans generally offer a **lower interest rate**, a **longer tenure** and higher amounts than unsecured loans. Common examples are home loans (property as security), vehicle loans (the vehicle) and gold loans (gold items). The lender will value the asset before disbursing and typically takes a **mortgage** or registers the asset. If you stop paying, the lender can recover the dues by selling the asset after due legal process.',
 'A home loan is secured: the property is mortgaged to the bank until the loan is fully closed, after which the mortgage is discharged.',
 '["Collateral","Unsecured Loan","Loan-to-Value Ratio","Mortgage","Foreclosure"]',
 'A secured loan is cheaper for the borrower but carries the risk of losing the asset if repayments seriously stop.',
 1, 9),

('unsecured-loan', 'Unsecured Loan', 'Security',
 'A loan given without any collateral, based mainly on the borrower''s income and credit profile.',
 'In an **unsecured loan** the lender does not hold any asset as security. Approval depends mainly on the borrower''s income stability, existing obligations and credit score. Because the lender has no asset to recover from, unsecured loans usually carry a **higher interest rate** and a **shorter tenure** than secured loans. They are also simpler in terms of documentation since there is no property to value or register. Personal loans and many business loans are unsecured.',
 'A personal loan of 300,000 with no security would typically cost more in interest than a home loan of the same amount, because the home is collateral.',
 '["Secured Loan","Collateral","Credit Score","EMI","Processing Fee"]',
 'No security means more freedom to borrow, but the price for that convenience is a higher rate.',
 1, 10),

('prepayment', 'Prepayment', 'Repayment',
 'Paying part or all of a loan before the scheduled end of its tenure.',
 '**Prepayment** means paying your loan off before the agreed tenure ends. A **part-prepayment** reduces the outstanding principal without closing the loan, while paying the full remaining amount is called **foreclosure**. Prepayment usually saves total interest because you stop paying interest on the principal you have already repaid. However, many lenders charge a **prepayment penalty** on loans that were taken at a floating rate, and some loans restrict prepayment for a period. For a loan with a fixed rate, the lender may recalculate the EMI. Always check the lender''s current penalty rules before making an extra payment.',
 'You have 40,000 spare and your EMI is affordable. If the lender permits part-prepayment without a penalty, making the payment reduces your principal immediately and lowers future interest.',
 '["Foreclosure","Part-Prepayment","Outstanding Balance","Prepayment Penalty","EMI"]',
 'Prepayment is one of the most effective ways to reduce total interest, provided the penalty is worth it.',
 1, 11),

('foreclosure', 'Foreclosure', 'Repayment',
 'Paying off the entire remaining loan amount and closing the loan before its tenure ends.',
 '**Foreclosure** is the full early settlement of a loan — you pay the outstanding principal plus interest up to that date, and the loan is closed. It is different from prepayment, which is usually a partial amount. Foreclosure is commonly allowed after a lock-in period, and many lenders charge a fee for it, particularly on floating-rate loans. After foreclosure you should obtain a **no-dues certificate** and ensure the security (such as a property mortgage) is formally discharged. If the fee is small relative to the interest you save, foreclosure is usually worthwhile.',
 'Three years into a home loan, you receive a large bonus. After checking the foreclosure fee, paying off the remaining outstanding amount can save years of interest — provided the fee is small relative to the saving.',
 '["Prepayment","Part-Prepayment","Loan Closure","Outstanding Balance","Processing Fee"]',
 'Foreclosure can cut years off the tenure and save substantial interest, but the lender''s fee must be weighed against the saving.',
 1, 12),

('outstanding-balance', 'Outstanding Balance', 'Repayment',
 'The amount of principal you still owe on a loan at any given point in time.',
 'The **outstanding balance** (or outstanding principal) is the amount still owed at a particular moment. It starts at the full loan amount and falls as the principal component of each EMI is paid. It is the figure on which the next month''s interest is calculated, and it is also the amount you would need to pay to close the loan early, usually plus interest up to that date and any applicable charges. Lenders issue a statement showing the outstanding balance, the interest component and the tenure remaining, which is useful when planning a prepayment or foreclosure.',
 'On day 100 of a 500,000 loan, your outstanding balance might be about 470,000. The next month''s interest will be calculated on that reduced figure, not on 500,000.',
 '["Principal","Amortization","Prepayment","Foreclosure","EMI"]',
 'Your outstanding balance is the true remaining cost. It falls as you pay and is what a prepayment reduces immediately.',
 1, 13),

('amortization', 'Amortization', 'Repayment',
 'The schedule that shows how each payment splits between principal and interest over the loan tenure.',
 'An **amortization schedule** is a table showing every instalment of a loan: the payment amount, the part that goes to interest, the part that goes to principal, and the balance still outstanding. It is the clearest way to understand a loan because it shows that early payments are mostly interest and later payments are mostly principal. An amortization **table** for a loan is usually generated by the lender and shared with the borrower at disbursal. In this project, the EMI calculator generates the same schedule instantly so you can see exactly how each EMI is allocated.',
 'For a 36-month loan, the first instalment might be 70% interest and 30% principal, while the last instalment is almost entirely principal. The table shows this shift month by month.',
 '["EMI","Principal","Interest","Outstanding Balance","Tenure"]',
 'Seeing the amortization makes it obvious why reducing tenure — or prepaying — reduces the total interest so much.',
 1, 14),

('moratorium', 'Moratorium', 'Repayment',
 'A period during which you do not begin making EMIs, even though interest may still apply.',
 'A **moratorium** is a grace period built into some loans where repayment does not start immediately. Education loans commonly have one that begins after the course ends. During a moratorium, depending on the loan terms, interest may either be **simple interest** (charged only on the original principal) or **capitalised** (added to the principal). If interest is capitalised, the amount you ultimately repay is higher, so ask the lender how the moratorium interest is treated. After the moratorium ends, the outstanding amount is repaid over the remaining tenure in EMIs.',
 'An education loan of 1,000,000 with a 12-month moratorium may still have interest for that year added to the principal, so repayment begins at more than 1,000,000.',
 '["Education Loan","Interest","EMI","Tenure","Capitalised Interest"]',
 'How interest is handled during a moratorium can significantly change the total amount you repay.',
 0, 15),

('default', 'Loan Default', 'Repayment',
 'Failing to meet a repayment obligation as agreed, such as missing an EMI or paying less than due.',
 'A **default** occurs when a borrower fails to meet the agreed repayment terms — missing an EMI, paying less than the amount due, or not repaying after the tenure ends. A single missed EMI is usually first treated as a **late payment** with a penalty. Repeated or prolonged default is more serious: the outstanding amount continues to grow with penalty interest, the credit bureau record is affected, and for secured loans the lender may issue notices and eventually initiate legal recovery from the collateral. If you are in difficulty, the right step is to contact the lender before a default escalates — many lenders have restructuring or restructuring-on-request options that are far less costly than recovery.',
 'Missing three EMIs in a row triggers late fees, reports the missed payments to the credit bureau, and if it continues, the lender may start recovery proceedings on the property or vehicle.',
 '["Late Payment","Penalty Interest","Credit Score","Foreclosure","Restructuring"]',
 'A short payment holiday is far cheaper than a long default. The longer it goes unresolved, the more expensive it becomes.',
 1, 16),

('late-payment', 'Late Payment', 'Repayment',
 'Paying an EMI after its due date, which usually attracts a penalty and can affect your credit record.',
 'A **late payment** occurs when an EMI is not paid by its **due date**. Most lenders allow a short grace period after the due date, and after that a **penalty or late fee** is added to the outstanding amount. The penalty also usually becomes part of the principal and starts attracting interest. Late payments are reported to credit bureaus, and repeated late payments can lower your credit score, making future borrowing costlier. Some lenders offer autopay or standing instructions, which reduce the chance of a missed EMI. If you know an EMI will be delayed, contacting the lender in advance is better than defaulting silently.',
 'An EMI of 12,000 due on the 5th is paid on the 12th. The lender may add a late fee of 300-600 to the outstanding amount, depending on its rules.',
 '["EMI","Due Date","Default","Penalty Interest","Credit Score"]',
 'A small late fee is minor, but repeated late payments damage your credit score, which is expensive to repair.',
 1, 17),

('loan-to-value-ratio', 'Loan-to-Value Ratio (LTV)', 'Security',
 'The ratio of the loan amount to the value of the property or asset used as security.',
 'The **Loan-to-Value (LTV) ratio** is the loan amount divided by the value of the asset, expressed as a percentage. For example, a 2,000,000 loan against a property worth 2,500,000 gives an LTV of 80%. Lenders set a maximum LTV depending on the property type and their own policy, and also often allow a top-up loan up to that limit. A higher LTV means the borrower has put in less of their own money — a **down payment** of the remaining percentage. Lenders also set minimum and maximum property values, so a very costly property may attract a lower LTV percentage. LTV rules differ by lender and property category and change over time — verify the current limit with the lender.',
 'Property worth 4,000,000, loan of 3,200,000. LTV = 3,200,000 / 4,000,000 = 80%. The borrower brings 800,000 as down payment.',
 '["Collateral","Secured Loan","Top-up Loan","Down Payment","Foreclosure"]',
 'LTV shows how much of the asset the lender is financing and how much equity you still hold.',
 0, 18),

('debt-to-income-ratio', 'Debt-to-Income Ratio (DTI)', 'Eligibility',
 'Your total monthly debt payments divided by your total monthly income, used to assess repayment capacity.',
 'The **Debt-to-Income (DTI) ratio** compares your total monthly debt obligations to your total monthly income. DTI = (all monthly debt payments) / (total monthly income). Lenders use it to judge whether you can service a new loan without straining your budget. A higher DTI means a larger share of your income is already committed, leaving less room for another EMI. Adding up EMIs on existing loans and credit-card minimum payments gives the numerator, and your gross monthly income gives the denominator. Lenders have their own DTI thresholds and these differ by product and change over time, so ask the lender for the exact rule they apply. Keeping DTI lower generally helps you qualify for better terms.',
 'Gross monthly income 80,000; existing EMIs and card payments total 24,000. DTI = 24,000 / 80,000 = 30%. A new EMI of 16,000 would raise it to 50%.',
 '["EMI","Income","Credit Score","Outstanding Balance","Repayment Capacity"]',
 'DTI is one of the clearest indicators of whether a new EMI would be comfortable for you to manage.',
 1, 19),

('reducing-balance-method', 'Reducing Balance Method', 'Interest',
 'The method where interest is charged only on the outstanding principal, not the original amount.',
 'Under the **reducing balance method**, interest is calculated on the outstanding principal at the end of each period, not on the original loan amount. This is the standard method for most retail loans, and it is why the interest portion of the EMI falls steadily over the tenure. The alternative is the **flat rate** method, where interest is computed on the original principal for the whole tenure and then divided; the effective cost of a flat rate is significantly higher than the headline number. Comparing two loans only makes sense if you know which method each uses, or if the lender provides the **effective rate**. On this platform, EMI calculations always use the reducing balance method.',
 'A 100,000 loan at 10% for one year: under reducing balance, total interest is about 5,590. Under a flat 10% method, interest would be 10,000 — the same headline rate but a much higher real cost.',
 '["Interest","Interest Rate","Effective Rate","Amortization","EMI"]',
 'The calculation method changes the true cost of a loan dramatically, even when the headline rate looks identical.',
 0, 20),

('effective-rate', 'Effective Interest Rate', 'Interest',
 'The true cost of a loan after fees are included, letting you compare different offers fairly.',
 'The **effective interest rate** (also called the APR — annual percentage rate) is the annual cost of the loan expressed as a percentage, after including processing fees, legal charges and mandatory insurance. Two offers can advertise different headline rates and still have different effective rates. For instance, Offer A at 9% with a large processing fee may be more expensive than Offer B at 9.5% with almost no fees. The effective rate is therefore the fairest basis of comparison between lenders. It is also sometimes shown to borrowers as an **APR** in the Key Fact Statement, which lenders are required to provide. Always read the Key Fact Statement before signing.',
 'Offer A: 9% rate, 3% processing fee. Offer B: 9.5% rate, 0.2% processing fee. On a 3-year loan, Offer B is often cheaper overall despite the higher headline rate.',
 '["Interest Rate","Processing Fee","Key Fact Statement","Foreclosure","Nominal Rate"]',
 'Comparing offers on the effective rate prevents you from choosing a loan that looks cheaper but is not.',
 0, 21),

('loan-closure', 'Loan Closure', 'Repayment',
 'The final step of settling a loan fully and getting confirmation that no dues remain.',
 '**Loan closure** happens when every instalment is paid and the loan account is formally closed. After the last EMI, the lender issues a **no dues certificate** and updates the credit bureau record to show the loan is closed. For secured loans, you must also get the **mortgage** or the asset registration released — a property loan stays in the records as encumbered until this discharge is done, so request it explicitly. Keep the final receipt, the no dues certificate and the release letter safely, as you may need them when selling the property later.',
 'After the final EMI on a home loan, the bank issues a no dues certificate and discharges the property mortgage. Both documents are needed when selling the property.',
 '["Foreclosure","Prepayment","Outstanding Balance","No Dues Certificate","Amortization"]',
 'A closed loan properly documented protects your credit record and prevents the asset from staying encumbered.',
 0, 22),

('part-prepayment', 'Part-Prepayment', 'Repayment',
 'Paying an extra amount toward the principal without fully closing the loan.',
 'A **part-prepayment** is an additional payment made during the tenure that reduces the outstanding principal but keeps the loan running. There are two common options: keep the EMI the same, in which case the tenure shortens; or keep the tenure the same, in which case the EMI falls. Which one you get depends on the lender and the loan type. On floating-rate loans, part-prepayment usually attracts a penalty. Part-prepayment is one of the most effective ways to cut total interest because the extra amount immediately stops attracting interest.',
 'You make an extra 50,000 payment. If the EMI stays the same, a 20-year loan might reduce to about 15 years, saving several lakhs in interest.',
 '["Prepayment","Foreclosure","Outstanding Balance","Penalty Interest","Amortization"]',
 'A well-planned part-prepayment often beats a low-cost floating rate when measuring the interest saved.',
 1, 23),

('due-date', 'Due Date', 'Repayment',
 'The date by which an EMI must be paid to avoid a late-payment penalty.',
 'The **due date** is the day of the month on which the EMI must reach the lender, usually a fixed date like the 5th or the 10th. Missing the due date attracts a **late payment** charge, and repeated misses affect your credit record. Some lenders allow you to choose or change the due date, and some offer a few days of grace period. Setting up an **autopay** or standing instruction is the most reliable way to pay on time. If the due date falls on a long weekend or a bank holiday, it is wise to pay a day or two early.',
 'An EMI due on 5 March paid on 7 March may attract a late fee, depending on the grace period the lender allows.',
 '["EMI","Late Payment","Default","Penalty Interest","Autopay"]',
 'Paying on or before the due date is the simplest way to avoid penalties and protect your credit record.',
 0, 24),

('hypothecation', 'Hypothecation', 'Security',
 'A legal arrangement where the lender holds rights over an asset until the loan is repaid.',
 'Under **hypothecation**, the borrower transfers rights over an asset to the lender as security, while continuing to physically hold and use it. This is common for vehicle loans: you keep using the car, but the **registration certificate (RC)** stays with the lender and the vehicle may carry a hypothecation note. Once the loan is closed, the lender hands back the RC and the note is removed. Hypothecation is also used in some business loans against stock or equipment. It differs from a mortgage, where the property itself remains encumbered on record until discharge.',
 'For a car loan, you use the car daily, but the bank holds the RC and the vehicle is registered as hypothecated to the bank until the final EMI.',
 '["Collateral","Secured Loan","Loan Closure","Mortgage","Vehicle Loan"]',
 'Hypothecation explains why you can keep using a financed vehicle while the lender still holds legal rights over it.',
 0, 25),

('effective-cost', 'Total Interest / Total Cost of Loan', 'Interest',
 'The full amount of interest you will pay across the entire tenure of a loan.',
 'The **total interest** is the sum of every interest component across all EMIs minus the principal you borrowed. Total amount payable = principal + total interest. This number is far more useful for comparison than the monthly EMI, because a low EMI can come with a very high total cost over a long tenure. It is also affected by the number of EMIs, since a longer tenure means more interest periods. In this project, the EMI calculator shows total interest and total payable alongside a full amortization table so the real cost is always visible. A lender must disclose the total cost in the Key Fact Statement.',
 'Two offers of 500,000 for 5 years: one has a lower EMI but 90,000 total interest, the other a higher EMI but 70,000 total interest. The second is better overall if affordable.',
 '["EMI","Amortization","Effective Rate","Interest","Key Fact Statement"]',
 'The EMI alone hides the true cost. Total interest is the number to compare between offers.',
 1, 26);

-- ═══════════════════════════════════════════════════════════════════════
--  DOCUMENTS  (24)
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO `documents`
(`slug`, `title`, `category`, `description`, `why_needed`, `typical_formats`, `applies_to`, `notes`, `is_required`, `sort_order`) VALUES

('pan-card', 'PAN Card', 'Identity Proof',
 'Permanent Account Number card issued by the Income Tax Department. The single most commonly asked identity document.',
 'PAN is used to verify your identity and tax record. Most lenders require it for any loan because it also appears on your income tax returns, which helps them cross-check income.',
 'PDF, JPG, PNG', 'personal-loan,home-loan,education-loan,vehicle-loan,business-loan,gold-loan',
 'A clear scanned copy with all four corners visible. Name on PAN should match your other documents.', 1, 1),

('aadhaar', 'Aadhaar Card', 'Identity Proof',
 'Unique identity document issued by the Unique Identification Authority of India (UIDAI).',
 'Aadhaar is widely accepted as both identity and address proof. Many lenders accept a masked Aadhaar for privacy.',
 'PDF, JPG, PNG', 'personal-loan,home-loan,education-loan,vehicle-loan,business-loan,gold-loan',
 'UIDAI allows a masked Aadhaar that hides the number while keeping the name and date of birth visible. Ask the lender if masking is needed.', 1, 2),

('passport', 'Passport', 'Identity Proof',
 'Valid passport issued by the Government of India. Also serves as proof of nationality and address.',
 'Accepted as identity proof and usually as address proof, especially for overseas education loans and where Aadhaar is unavailable.',
 'PDF, JPG, PNG', 'personal-loan,home-loan,education-loan,vehicle-loan,gold-loan',
 'Provide the photo page; if the address page differs, include that too.', 0, 3),

('driving-licence', 'Driving Licence', 'Identity Proof',
 'Valid driving licence issued by a state transport authority.',
 'Accepted as identity proof and, in many cases, address proof.',
 'PDF, JPG, PNG', 'personal-loan,vehicle-loan,home-loan',
 'Must be valid and readable. Vehicle-loan applicants should ensure the licence category is appropriate.', 0, 4),

('passport-size-photo', 'Passport Size Photograph', 'Identity Proof',
 'Recent passport-size photographs of the applicant and, where required, the co-applicant.',
 'Used for record-keeping and identification at the branch, and for gold loans the photograph of the pledged items is often required.',
 'JPG, PNG', 'gold-loan,personal-loan,vehicle-loan,education-loan',
 'Recent photograph, plain background, clear face. Gold lenders often ask for a photo of each ornament taken at the time of pledge.', 0, 5),

('utility-bill', 'Utility Bill (Address Proof)', 'Address Proof',
 'A recent electricity, telephone, gas or broadband bill showing your name and current address.',
 'Used to confirm your residential address when it is not reflected on your identity document.',
 'PDF, JPG, PNG', 'personal-loan,home-loan,education-loan,vehicle-loan,business-loan',
 'Should be recent — many lenders want a bill from the last one to three months only.', 0, 6),

('rent-agreement', 'Rent Agreement', 'Address Proof',
 'Registered rental agreement showing the address and tenure of stay.',
 'Used as address proof when you live in a rented home and other proof is not available.',
 'PDF, JPG, PNG', 'personal-loan,home-loan,vehicle-loan',
 'Some lenders require the agreement to be registered and to have a fixed tenure.', 0, 7),

('salary-slips', 'Salary Slips', 'Income Proof',
 'Recent salary slips, usually the last three to six months, showing gross pay and deductions.',
 'They are the primary proof of income and a standard requirement for salaried applicants to assess repayment capacity.',
 'PDF, JPG, PNG', 'personal-loan,home-loan,education-loan,vehicle-loan',
 'Ask your employer for slips covering the period the lender requests. Lenders often want a consistent salary across the months.', 1, 8),

('bank-statements', 'Bank Statements', 'Income Proof',
 'Bank account statements for the last three to six months showing salary credits and transactions.',
 'They help the lender verify actual credits into the account and understand your spending and existing obligations.',
 'PDF', 'personal-loan,home-loan,education-loan,vehicle-loan,business-loan',
 'Most lenders require the statement to be digitally generated by the bank, not a screenshot. Download from net banking or the bank branch.', 1, 9),

('itr', 'Income Tax Returns (ITR)', 'Income Proof',
 'Filed income tax returns, usually for the last two years, acknowledged by the tax department.',
 'Used to cross-verify your declared income against what the lender sees in salary slips or bank credits.',
 'PDF', 'personal-loan,home-loan,vehicle-loan,business-loan,education-loan',
 'Older lenders sometimes request ITR for a period of two or three years. The acknowledgment is usually sufficient.', 0, 10),

('form-16', 'Form 16 / TDS Certificate', 'Income Proof',
 'Certificate issued by your employer showing the salary on which tax was deducted at source.',
 'Confirms your annual declared income and the tax deducted, complementing salary slips and ITR.',
 'PDF', 'personal-loan,home-loan,vehicle-loan,education-loan',
 'Form 16A is the TRS summary, while Form 16 is the salary TDS certificate. Lenders usually ask for Form 16.', 0, 11),

('employment-proof', 'Employment Proof / Offer Letter', 'Employment Proof',
 'Appointment letter, offer letter, employee ID or relieving letter confirming your job and joining date.',
 'Helps the lender verify job stability — the length of service is an important input in assessing eligibility.',
 'PDF, JPG, PNG', 'personal-loan,home-loan,vehicle-loan,education-loan',
 'Older lenders sometimes ask for a relieving letter or experience certificate along with the appointment letter.', 0, 12),

('business-registration', 'Business Registration', 'Employment Proof',
 'GST registration certificate, MSME / Udyam registration, Shops and Establishment licence or partnership deed.',
 'Establishes that the business is legally registered and operating, which is essential for a business loan.',
 'PDF, JPG, PNG', 'business-loan',
 'Which documents apply depends on the business structure — proprietorship, partnership or private limited.', 1, 13),

('business-financials', 'Business Financial Statements', 'Income Proof',
 'Profit and loss account, balance sheet, and income tax returns filed by the business.',
 'Shows the profitability and stability of the business, which is the main factor in assessing business loan eligibility.',
 'PDF', 'business-loan',
 'Lenders often ask for audited statements for larger amounts, and for the last two or three financial years.', 1, 14),

('sale-deed', 'Sale Deed / Agreement', 'Property Documents',
 'The registered document proving ownership of the property being purchased or used as security.',
 'Establishes clear title to the property, which is the primary security check in a home loan.',
 'PDF, JPG, PNG', 'home-loan,vehicle-loan',
 'The title chain should be traceable without gaps, and the seller''s identity must be verified by the lender''s legal team.', 1, 15),

('property-tax-receipt', 'Property Tax Receipt', 'Property Documents',
 'Receipts showing that property tax has been paid up to the current year.',
 'Outstanding property tax dues can complicate the property transfer, so lenders check that they are cleared.',
 'PDF, JPG, PNG', 'home-loan',
 'Usually required for the current year and sometimes the previous year as well.', 0, 16),

('approved-plan', 'Approved Building Plan / Layout Plan', 'Property Documents',
 'Sanctioned plan of the property or the proposed construction.',
 'Confirms that the construction is legally approved and matches the sanctioned plan, which protects the property value.',
 'PDF, JPG, PNG', 'home-loan',
 'For a plot purchase or self-construction, the sanctioned layout plan is important.', 0, 17),

('occupancy-certificate', 'Occupancy / Completion Certificate', 'Property Documents',
 'Certificate confirming that the building is ready for occupation and complies with regulations.',
 'Proves the property is legally complete and can be used, and confirms its current usable value.',
 'PDF, JPG, PNG', 'home-loan',
 'Needed for a loan on a completed property. Not applicable while construction is still in progress.', 0, 18),

('noc-from-builder', 'Completion / Possession Letter from Builder', 'Property Documents',
 'Letter from the builder confirming that construction is complete and the unit is ready for possession.',
 'Confirms that the borrower is entitled to the property being financed, especially in a under-construction purchase.',
 'PDF, JPG, PNG', 'home-loan',
 'Relevant when buying from a developer rather than an existing owner.', 0, 19),

('valuation-report', 'Property Valuation Report', 'Property Documents',
 'A professional assessment of the market value of the property, prepared by the lender''s empanelled valuer.',
 'Determines the maximum loan amount based on the LTV and is used to confirm the property''s value.',
 'PDF', 'home-loan,vehicle-loan,gold-loan',
 'Usually arranged by the lender, and the cost is often deducted from the disbursed amount.', 0, 20),

('gold-items-photo', 'Photograph of Gold Items / Valuation', 'Loan Specific',
 'Clear photographs of the gold ornaments, coins or bars being pledged, along with the purity and weight details.',
 'Forms the record of what was pledged, which is essential for settling disputes after the loan is repaid.',
 'JPG, PNG, PDF', 'gold-loan',
 'Note down the number of items, their approximate weight and any hallmarks before handing them over, and get a proper pledge receipt.', 1, 21),

('existing-loan-statement', 'Existing Loan Statement / Payoff Letter', 'Loan Specific',
 'Latest statement of any existing loan, including the outstanding amount and the number of remaining EMIs.',
 'Lenders use it to verify your existing obligations and to work out the exact amount needed to close the old loan.',
 'PDF', 'home-loan,personal-loan,business-loan,vehicle-loan',
 'Required when transferring or refinancing a loan. Some lenders require a statement dated within the last 15 days.', 0, 22),

('cheque-unsigned', 'Unsigned Cheque / Bank Mandate', 'Loan Specific',
 'Post-dated cheques equal to the EMI amount, or an e-mandate for automatic collection.',
 'Acts as the collection mechanism so the lender receives EMIs on time without manual action.',
 'PDF, JPG, PNG', 'personal-loan,home-loan,education-loan,vehicle-loan,business-loan',
 'Sign these only after reading the loan agreement. Keep track of the cheque series and hand them over only for the agreed EMIs.', 0, 23);

-- ═══════════════════════════════════════════════════════════════════════
--  ELIGIBILITY FACTORS (11) — educational explainer, NOT an approval system
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO `eligibility_factors`
(`slug`, `factor`, `category`, `icon`, `summary`, `explanation`, `typical_consideration`, `impact`, `example`, `sort_order`) VALUES

('age', 'Age', 'Personal', 'Cake',
 'Your age is one of the first things a lender considers, usually through the maximum age allowed at the end of the tenure.',
 'Lenders usually set a minimum age to enter a loan agreement and a maximum age by the time the loan is fully repaid, not at the time you apply. This means the tenure you choose affects whether you qualify at all. Typical entry ages fall in the young adult range, and the maximum age at loan closure is usually in the early sixties, but the exact range differs by lender and by loan type — education loans, for example, allow a higher upper age because repayment starts later. Some lenders also require that the borrower has completed a minimum period of employment or stability by the time of application.',
 'General guidance only: lenders commonly look for the applicant to be a major and within their age window at loan closure. The specific minimum and maximum ages are set by each lender and change over time.',
 'high',
 'A 55-year-old applying for a 20-year home loan would reach 75 at closure, which is beyond many lenders'' maximum age, so a shorter tenure would be required.', 1),

('income', 'Income', 'Income', 'Wallet',
 'A steady, documented income source is usually the most important factor in assessing repayment capacity.',
 'Lenders need confidence that you can pay the EMI every month for the whole tenure. They look at your **gross monthly income** and the consistency of that income over time — a salaried person with a fixed monthly credit is easier to assess than a fluctuating business income. Income is normally supported by salary slips, bank statements and sometimes ITR or Form 16. A common concept is that a lender wants the new EMI plus existing EMIs to be a **manageable share of your net income**, leaving enough for living expenses. That share differs by lender and product, so ask the lender for the exact rule.',
 'General guidance only: lenders commonly expect a majority of net monthly income to be available after existing EMIs. The exact percentage and the documents required differ by lender and change over time.',
 'high',
 'Net monthly income 60,000 with existing EMIs of 15,000 leaves 45,000 available. A new EMI of 16,000 is about 27% of gross income, which many lenders would find comfortable to assess.', 2),

('employment-status', 'Employment Status and Stability', 'Employment', 'Briefcase',
 'Whether you are salaried, self-employed or in business affects how your income is verified.',
 '**Salaried** applicants are assessed using salary slips, Form 16 and bank credits, which is usually the simplest documentation. **Self-employed** professionals and **business owners** are assessed using their business income, ITR filings, bank statements and business financial statements, and lenders often ask for a longer track record of business. A common concept is **employment vintage** — the length of time you have been in your current job or business. Longer stability generally gives more confidence in continued income, so lenders often prefer a minimum number of months in the job or years in business.',
 'General guidance only: lenders commonly prefer a minimum period of continuous employment or business operation. The exact requirement differs by lender, product and profile and changes over time.',
 'high',
 'A salaried applicant who joined six months ago may need to provide more detailed income evidence than someone with three years in the same role, because there is less history to assess.', 3),

('credit-history', 'Credit History', 'Credit', 'History',
 'A record of how you have repaid past credit, built up from loans and credit cards over time.',
 '**Credit history** is the track record of your past borrowing and repayment. It is built from credit-card repayments, existing loan EMIs and any record of late payment or default. It becomes meaningful only after you have some credit experience, so if you have never borrowed before, there is no history to assess — this is why a credit-builder activity such as a secured card can help. Consistent on-time repayment builds a positive history. Late payments, high credit-card utilisation and frequent inquiry for new credit can weaken it. Lenders use the history together with the score, never on its own.',
 'General guidance only: lenders prefer a history with no missed payments over the last one to two years. The exact look-back period differs by lender and changes over time.',
 'high',
 'Someone with four credit cards, all payments on time and low balances, has a stronger history than someone with three cards where two have minimum payments only.', 4),

('credit-score-factor', 'Credit Score', 'Credit', 'Gauge',
 'A summary number of your creditworthiness, usually on a scale roughly from 300 to 900 in India.',
 'A **credit score** compresses your credit history into a single number that lenders can read quickly. The commonly used Indian bureaus are CIBIL, Equifax, CRISIL and ICRA, with scores generally ranging from 300 to 900. Bands are usually described as poor, fair, good and excellent. A higher score generally means more consistent repayment, and lenders often use it to decide whether to approve and at what rate. Because the score is only a summary, it is always read together with income and existing debts. You can request a free report from the bureaus periodically and check it for errors, which is a practical first step before applying.',
 'General guidance only: lenders generally prefer a score in the good or higher range, and each lender has its own cut-off. Cut-offs, score models and what counts as a good score differ by bureau and lender, and change over time.',
 'high',
 'With the same income and the same loan amount, two applicants can be offered very different outcomes if their credit scores are in different bands.', 5),

('existing-debt', 'Existing Debt / Obligations', 'Debt', 'Layers',
 'The loans and card payments you are already committed to are added up before a new one is assessed.',
 'Before approving a new loan, a lender looks at what you already owe. This includes EMIs on existing loans, credit-card minimum payments, and sometimes other obligations. A person with two EMIs already may find a third one difficult to service, even if the amount looks affordable in isolation. Reducing existing debt before applying is often the most effective way to improve your chances, because it lowers both your obligations and your DTI ratio. Consolidating several small debts into one loan can also help, provided the new rate is genuinely lower.',
 'General guidance only: lenders assess how much of your income is already committed. The number of existing EMIs they are comfortable with differs by lender and product.',
 'high',
 'Existing EMIs of 12,000 and 9,000 on a net income of 55,000 leaves 34,000 before adding a new EMI.', 6),

('dti-factor', 'Debt-to-Income Ratio (DTI)', 'Debt', 'Scale',
 'The share of your income already used for debt payments, compared with what would be left for a new EMI.',
 '**DTI = total monthly debt payments / total monthly income.** It expresses how much of your income is already committed. Lenders use it as a quick measure of repayment capacity: the lower your DTI, the more room you have for a new EMI. To calculate yours, add up all current EMIs and credit-card minimum payments, then divide by your gross monthly income. If the result is already high, the options are to reduce existing debt, improve income, or apply for a smaller amount or a longer tenure — though a longer tenure increases total interest, so it is a genuine trade-off.',
 'General guidance only: lenders commonly have a maximum acceptable DTI. The threshold differs by lender and product, so ask the lender for the figure they use and how they calculate it.',
 'high',
 'EMIs and card payments of 30,000 on a gross income of 100,000 give a DTI of 30%. Adding a 20,000 EMI raises it to 50%, which may be beyond what a lender is comfortable with.', 7),

('loan-amount', 'Loan Amount Requested', 'Compliance', 'Banknote',
 'The amount you ask for is checked against your income, existing obligations and the value of any security.',
 'The amount a lender is willing to give is a **derived number**, not simply what you ask for. For unsecured loans it depends mainly on income and existing obligations. For secured loans it also depends on the **LTV ratio** applied to the value of the property or asset. If you request more than the derived amount, the lender may either reduce the amount or decline. Requesting a smaller amount than you can repay is sensible because a lower amount means lower interest and a shorter tenure. It is worth asking the lender what amount they would be comfortable with before you finalise your own figure.',
 'General guidance only: lenders assess the amount against income and, for secured loans, against the asset value using their LTV policy. Policies differ by lender and change over time.',
 'medium',
 'A home worth 5,000,000 with a lender LTV policy of 80% caps the loan at 4,000,000, so asking for 4,500,000 would be reduced or declined.', 8),

('loan-tenure-factor', 'Loan Tenure', 'Compliance', 'CalendarClock',
 'The tenure you choose affects both your EMI and whether you are within the lender''s permitted tenure limits.',
 'Tenure is usually constrained by your age at the end of the loan, the loan type and the lender''s rules. Within that range, tenure is a choice. A shorter tenure means a higher EMI but a much lower total interest; a longer tenure means a lower EMI and a much higher total interest. Lenders prefer a tenure that keeps the DTI comfortable, so a lower EMI can actually help your eligibility, but it is a trade-off you should make deliberately. Choosing a tenure you can sustain matters more than choosing the most aggressive one, because a default costs far more than extra interest.',
 'General guidance only: lenders set minimum and maximum tenures by product and by the age of the borrower at the end of the tenure. These limits differ by lender and change over time.',
 'medium',
 'A lender may cap the tenure at 25 years for a 40-year-old borrower. A 30-year request would need to be reduced to 25 years, raising the EMI.',
 9),

('documentation', 'Documentation', 'Compliance', 'FolderCheck',
 'Whether you can produce the required documents quickly and completely affects how long approval takes.',
 'A complete file is the single biggest factor in avoiding delays. Lenders typically need identity proof, address proof, income proof and, for secured loans, property documents. Missing or illegible documents are the most common cause of an application being put on hold. A useful habit is to assemble a single folder containing digital copies of everything, with clear names, before applying. If a document is missing — for example a job change means a new Form 16 is not yet available — ask the lender early whether an alternative is acceptable. Verifying the document list before applying also prevents you from approaching a lender you are not eligible for.',
 'General guidance only: the exact list varies by lender, loan type and applicant profile. Always obtain the current list from the lender before you start collecting documents.',
 'medium',
 'Applying with an older Form 16 while the lender requires the latest one can add weeks. Checking the list first avoids a resubmission.', 10),

('co-applicant', 'Co-applicant or Guarantor', 'Personal', 'Users',
 'Someone who is equally responsible for the loan, commonly used when the primary applicant has a shorter income history.',
 'A **co-applicant** is a person who signs the loan agreement and becomes equally responsible for repayment. Education loans commonly use a parent or guardian as co-applicant. A co-applicant''s income and credit profile can strengthen the application, and in some products the combined income is used to assess capacity. It also means the co-applicant''s credit record is affected by the loan and is liable if the primary applicant stops paying. A **guarantor** is a slightly different arrangement: they are legally bound if the borrower defaults but are not normally assessed for the same way. Both roles should be entered into with care.',
 'General guidance only: lenders differ in whether they accept a co-applicant, a guarantor, or both, and in how they assess the arrangement.',
 'medium',
 'A student with no income can usually strengthen the application by adding a parent as co-applicant, whose salary and credit profile are then assessed.', 11);

-- ═══════════════════════════════════════════════════════════════════════
--  FAQS (12)
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO `faqs` (`question`, `answer`, `category`, `sort_order`, `is_published`) VALUES

('What is a loan, in simple words?',
 'A loan is an amount of money a lender gives you for a stated period, in exchange for paying it back with interest. You receive the money now, and you repay it later in instalments. The interest is the lender''s charge for the money, and it is usually calculated on the amount you still owe rather than the original loan. Different loans are designed for different needs — personal, home, education, vehicle, business and gold loans — and they differ in security, tenure and cost.',
 'Basics', 1, 1),

('What is the difference between principal and interest?',
 'The **principal** is the amount you originally borrowed. **Interest** is the extra amount the lender charges for lending you that money. Every monthly instalment (EMI) contains both: a part that reduces the principal you still owe, and a part that covers the interest for that month. Early EMIs are mostly interest; later EMIs are mostly principal. The interest is always calculated on the outstanding principal, which is why your principal falls and your interest portion falls with it.',
 'Basics', 2, 1),

('How is EMI calculated?',
 'EMI is calculated with the standard formula: **EMI = P x r x (1 + r)^n / ((1 + r)^n - 1)**, where P is the loan amount, r is the monthly interest rate (annual rate divided by 12 and by 100), and n is the number of monthly instalments. You can try it yourself in the EMI Calculator on this site, which also shows the full amortization schedule so you can see how each instalment splits between principal and interest.',
 'Basics', 3, 1),

('Do I need a high credit score to get a loan?',
 'A good credit score generally helps, but it is only one of several inputs. Lenders also assess your income, existing obligations, employment stability and, for secured loans, the value of the property. A lower score does not always mean a refusal, but it can mean a higher rate or a smaller amount. The practical step is to build a repayment record — pay every EMI and credit-card bill on time and keep card utilisation low — and to check your credit report periodically for errors.',
 'Eligibility', 4, 1),

('What documents do I usually need for a loan?',
 'The common set is: **identity proof** (PAN, Aadhaar, passport or driving licence), **address proof**, **income proof** (salary slips, bank statements, ITR or Form 16), and **employment proof** such as an appointment letter. Secured loans add **property or asset documents** — for a home loan this includes the sale deed, approved plan and property tax receipts. The exact list varies by lender, loan type and applicant profile, so always get the current list from the lender before you start collecting.',
 'Documents', 5, 1),

('What happens if I miss an EMI?',
 'Missing an EMI is first treated as a **late payment**: a penalty or late fee is added, it starts attracting additional interest, and it is reported to the credit bureau. Repeated missed EMIs turn into a **default**, which can seriously damage your credit score and, for a secured loan, can eventually lead the lender to initiate legal recovery from the collateral. If you are going to miss an EMI, contact the lender before the due date — many will consider a restructuring or a short repayment arrangement, which is far less costly than recovery.',
 'Repayment', 6, 1),

('What is the difference between prepayment and foreclosure?',
 '**Prepayment** is paying an extra amount during the tenure. A **part-prepayment** reduces the outstanding principal but keeps the loan open, while **foreclosure** is paying off the entire remaining amount and closing the loan. Both can reduce your total interest because the amount you have already repaid stops attracting interest. However, many lenders charge a prepayment or foreclosure penalty, particularly on floating-rate loans. Check the lender''s current penalty rules, and compare the penalty against the interest you would save.',
 'Repayment', 7, 1),

('What is a moratorium period?',
 'A **moratorium** is a period during which you do not begin making EMIs, even though the loan exists. Education loans commonly have one that starts after the course ends. During the moratorium, interest may either be **simple interest** (charged only on the original principal and not compounded) or **capitalised** (added to the principal you will eventually repay). If it is capitalised, the total amount you repay is higher, so always ask the lender how the moratorium interest is treated before you accept the loan.',
 'Repayment', 8, 1),

('Is a secured loan cheaper than an unsecured loan?',
 'Usually yes. A **secured loan** is backed by an asset — a property, a vehicle or gold — so the lender has something to recover from. That security normally results in a **lower interest rate**, a **longer tenure** and a higher amount. An **unsecured loan** has no security, so approval depends more on your income and credit score, and the interest rate is normally higher. The trade-off is risk: with a secured loan, serious and prolonged default can mean losing the asset.',
 'Basics', 9, 1),

('How do I know the real cost of a loan?',
 'Look at three numbers rather than the headline rate: the **total interest**, the **total amount payable** over the full tenure, and the **effective interest rate** (also called the APR) which includes fees. A lower EMI often means a longer tenure, which means substantially more total interest. Processing fees and prepayment penalties also change the real cost. Lenders must disclose the total cost in the Key Fact Statement, so read it carefully and compare offers on the effective rate rather than the advertised rate.',
 'Basics', 10, 1),

('Can I use the EMI calculator result as a loan offer?',
 'No. The EMI calculator here is an **educational tool** for understanding how a loan is structured. The EMI depends on the exact interest rate the lender applies, the fees they charge and the tenure they allow. Interest rates change frequently and differ by lender, credit profile and market conditions, so any number produced here is an illustration and not a quote. For a real, current figure, contact the lender directly.',
 'Calculator', 11, 1),

('Does this assistant approve loans or give financial advice?',
 'No. This assistant provides **educational information** about loan concepts, terminology, eligibility factors, documents, EMI and repayment. It does not approve loans, does not represent any bank or lender, and does not give personalised financial advice. Actual eligibility and loan terms depend entirely on the lender''s current policies and your verified information. Always confirm details such as interest rates, fees and required documents directly with the lender.',
 'About', 12, 1);

-- ═══════════════════════════════════════════════════════════════════════
--  BRIDGE TABLES — which terms and documents relate to which loan type
--  (Uses natural keys so the seed is order independent)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO `loan_type_terms` (`loan_type_id`, `term_id`, `relevance`)
SELECT lt.`id`, t.`id`, x.`relevance`
FROM (
  SELECT 'personal-loan' AS loan, 'emi' AS term, 'core' AS relevance UNION ALL
  SELECT 'personal-loan', 'principal', 'core' UNION ALL
  SELECT 'personal-loan', 'interest', 'core' UNION ALL
  SELECT 'personal-loan', 'tenure', 'core' UNION ALL
  SELECT 'personal-loan', 'unsecured-loan', 'core' UNION ALL
  SELECT 'personal-loan', 'credit-score', 'common' UNION ALL
  SELECT 'personal-loan', 'foreclosure', 'common' UNION ALL
  SELECT 'personal-loan', 'processing-fee', 'common' UNION ALL
  SELECT 'personal-loan', 'debt-to-income-ratio', 'common' UNION ALL
  SELECT 'personal-loan', 'outstanding-balance', 'common' UNION ALL
  SELECT 'personal-loan', 'effective-cost', 'common' UNION ALL

  SELECT 'home-loan', 'emi', 'core' UNION ALL
  SELECT 'home-loan', 'collateral', 'core' UNION ALL
  SELECT 'home-loan', 'secured-loan', 'core' UNION ALL
  SELECT 'home-loan', 'loan-to-value-ratio', 'core' UNION ALL
  SELECT 'home-loan', 'tenure', 'core' UNION ALL
  SELECT 'home-loan', 'amortization', 'core' UNION ALL
  SELECT 'home-loan', 'part-prepayment', 'common' UNION ALL
  SELECT 'home-loan', 'foreclosure', 'common' UNION ALL
  SELECT 'home-loan', 'interest-rate', 'common' UNION ALL
  SELECT 'home-loan', 'outstanding-balance', 'common' UNION ALL
  SELECT 'home-loan', 'loan-closure', 'common' UNION ALL
  SELECT 'home-loan', 'debt-to-income-ratio', 'common' UNION ALL
  SELECT 'home-loan', 'effective-rate', 'common' UNION ALL
  SELECT 'home-loan', 'processing-fee', 'common' UNION ALL

  SELECT 'education-loan', 'moratorium', 'core' UNION ALL
  SELECT 'education-loan', 'emi', 'core' UNION ALL
  SELECT 'education-loan', 'secured-loan', 'core' UNION ALL
  SELECT 'education-loan', 'tenure', 'core' UNION ALL
  SELECT 'education-loan', 'principal', 'common' UNION ALL
  SELECT 'education-loan', 'interest', 'common' UNION ALL
  SELECT 'education-loan', 'prepayment', 'common' UNION ALL
  SELECT 'education-loan', 'outstanding-balance', 'common' UNION ALL
  SELECT 'education-loan', 'loan-closure', 'common' UNION ALL

  SELECT 'vehicle-loan', 'collateral', 'core' UNION ALL
  SELECT 'vehicle-loan', 'secured-loan', 'core' UNION ALL
  SELECT 'vehicle-loan', 'emi', 'core' UNION ALL
  SELECT 'vehicle-loan', 'hypothecation', 'core' UNION ALL
  SELECT 'vehicle-loan', 'tenure', 'core' UNION ALL
  SELECT 'vehicle-loan', 'foreclosure', 'common' UNION ALL
  SELECT 'vehicle-loan', 'loan-closure', 'common' UNION ALL
  SELECT 'vehicle-loan', 'outstanding-balance', 'common' UNION ALL
  SELECT 'vehicle-loan', 'loan-to-value-ratio', 'common' UNION ALL

  SELECT 'business-loan', 'secured-loan', 'core' UNION ALL
  SELECT 'business-loan', 'unsecured-loan', 'core' UNION ALL
  SELECT 'business-loan', 'emi', 'core' UNION ALL
  SELECT 'business-loan', 'tenure', 'core' UNION ALL
  SELECT 'business-loan', 'collateral', 'common' UNION ALL
  SELECT 'business-loan', 'credit-score', 'common' UNION ALL
  SELECT 'business-loan', 'foreclosure', 'common' UNION ALL
  SELECT 'business-loan', 'debt-to-income-ratio', 'common' UNION ALL

  SELECT 'gold-loan', 'collateral', 'core' UNION ALL
  SELECT 'gold-loan', 'secured-loan', 'core' UNION ALL
  SELECT 'gold-loan', 'tenure', 'core' UNION ALL
  SELECT 'gold-loan', 'outstanding-balance', 'core' UNION ALL
  SELECT 'gold-loan', 'foreclosure', 'common' UNION ALL
  SELECT 'gold-loan', 'principal', 'common' UNION ALL
  SELECT 'gold-loan', 'interest', 'common' UNION ALL
  SELECT 'gold-loan', 'loan-closure', 'common'
) AS x
JOIN `loan_types` lt ON lt.`slug` = x.loan
JOIN `loan_terms`  t  ON t.`slug`  = x.term;

INSERT INTO `loan_type_documents` (`loan_type_id`, `document_id`, `is_core`)
SELECT lt.`id`, d.`id`, x.`is_core`
FROM (
  SELECT 'personal-loan' AS loan, 'pan-card' AS doc, 1 AS is_core UNION ALL
  SELECT 'personal-loan', 'aadhaar', 0 UNION ALL
  SELECT 'personal-loan', 'utility-bill', 0 UNION ALL
  SELECT 'personal-loan', 'salary-slips', 1 UNION ALL
  SELECT 'personal-loan', 'bank-statements', 1 UNION ALL
  SELECT 'personal-loan', 'employment-proof', 0 UNION ALL
  SELECT 'personal-loan', 'itr', 0 UNION ALL
  SELECT 'personal-loan', 'passport-size-photo', 0 UNION ALL

  SELECT 'home-loan', 'pan-card', 1 UNION ALL
  SELECT 'home-loan', 'aadhaar', 0 UNION ALL
  SELECT 'home-loan', 'salary-slips', 1 UNION ALL
  SELECT 'home-loan', 'bank-statements', 1 UNION ALL
  SELECT 'home-loan', 'employment-proof', 0 UNION ALL
  SELECT 'home-loan', 'itr', 0 UNION ALL
  SELECT 'home-loan', 'form-16', 0 UNION ALL
  SELECT 'home-loan', 'sale-deed', 1 UNION ALL
  SELECT 'home-loan', 'property-tax-receipt', 0 UNION ALL
  SELECT 'home-loan', 'approved-plan', 0 UNION ALL
  SELECT 'home-loan', 'occupancy-certificate', 0 UNION ALL
  SELECT 'home-loan', 'noc-from-builder', 0 UNION ALL
  SELECT 'home-loan', 'valuation-report', 0 UNION ALL
  SELECT 'home-loan', 'existing-loan-statement', 0 UNION ALL

  SELECT 'education-loan', 'pan-card', 1 UNION ALL
  SELECT 'education-loan', 'aadhaar', 0 UNION ALL
  SELECT 'education-loan', 'passport', 0 UNION ALL
  SELECT 'education-loan', 'utility-bill', 0 UNION ALL
  SELECT 'education-loan', 'salary-slips', 1 UNION ALL
  SELECT 'education-loan', 'bank-statements', 1 UNION ALL
  SELECT 'education-loan', 'itr', 0 UNION ALL
  SELECT 'education-loan', 'employment-proof', 0 UNION ALL
  SELECT 'education-loan', 'cheque-unsigned', 0 UNION ALL

  SELECT 'vehicle-loan', 'pan-card', 1 UNION ALL
  SELECT 'vehicle-loan', 'aadhaar', 0 UNION ALL
  SELECT 'vehicle-loan', 'driving-licence', 0 UNION ALL
  SELECT 'vehicle-loan', 'utility-bill', 0 UNION ALL
  SELECT 'vehicle-loan', 'salary-slips', 1 UNION ALL
  SELECT 'vehicle-loan', 'bank-statements', 1 UNION ALL
  SELECT 'vehicle-loan', 'employment-proof', 0 UNION ALL
  SELECT 'vehicle-loan', 'cheque-unsigned', 0 UNION ALL

  SELECT 'business-loan', 'pan-card', 1 UNION ALL
  SELECT 'business-loan', 'aadhaar', 0 UNION ALL
  SELECT 'business-loan', 'business-registration', 1 UNION ALL
  SELECT 'business-loan', 'business-financials', 1 UNION ALL
  SELECT 'business-loan', 'itr', 1 UNION ALL
  SELECT 'business-loan', 'bank-statements', 1 UNION ALL
  SELECT 'business-loan', 'utility-bill', 0 UNION ALL

  SELECT 'gold-loan', 'pan-card', 1 UNION ALL
  SELECT 'gold-loan', 'aadhaar', 0 UNION ALL
  SELECT 'gold-loan', 'passport', 0 UNION ALL
  SELECT 'gold-loan', 'driving-licence', 0 UNION ALL
  SELECT 'gold-loan', 'gold-items-photo', 1 UNION ALL
  SELECT 'gold-loan', 'passport-size-photo', 1
) AS x
JOIN `loan_types` lt ON lt.`slug` = x.loan
JOIN `documents`  d  ON d.`slug`  = x.doc;

-- ═══════════════════════════════════════════════════════════════════════
--  Verification
-- ═══════════════════════════════════════════════════════════════════════
SELECT 'users' AS table_name, COUNT(*) AS rows_count FROM users
UNION ALL SELECT 'loan_types', COUNT(*) FROM loan_types
UNION ALL SELECT 'loan_terms', COUNT(*) FROM loan_terms
UNION ALL SELECT 'documents', COUNT(*) FROM documents
UNION ALL SELECT 'eligibility_factors', COUNT(*) FROM eligibility_factors
UNION ALL SELECT 'faqs', COUNT(*) FROM faqs
UNION ALL SELECT 'loan_type_terms', COUNT(*) FROM loan_type_terms
UNION ALL SELECT 'loan_type_documents', COUNT(*) FROM loan_type_documents;

-- Seed complete.
-- Next:  npm run dev
