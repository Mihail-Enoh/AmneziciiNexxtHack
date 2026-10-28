# Grijă pentru Mâine

# Build a polished web application for a Romanian financial-futures hackathon

Build a complete, responsive, high-quality web application prototype called **Prototype123**.

Prototype123 is a **family financial planning application for Romanians with aging parents**.

The core problem is:

> Most adults prepare financially for their own future, but very few know what will happen financially if one of their parents becomes dependent on them.

The application should help a Romanian adult understand:

1. What caring for an aging parent could cost in the future.
2. How much of that cost the parent's existing income and savings could cover.
3. What financial gap may remain for the family.
4. How siblings and family members could share that burden.
5. How taking action today can reduce the future burden.
6. How different future scenarios change the outcome.

This is NOT:
- a generic budgeting app
- an investment platform
- a banking application
- an accounting application
- a medical diagnosis application
- an insurance marketplace
- a retirement calculator
- a chatbot-first experience

The experience should revolve around one simple question:

> **“If one of my parents needs my financial support in the future, will my family be prepared?”**

The application should make a frightening and uncertain future situation feel understandable, concrete and manageable.

---

# PRODUCT POSITIONING

Primary target user:

**Romanian adults approximately 30–50 years old who have parents approaching retirement or already retired.**

Typical persona:

- 36 years old
- lives in Bucharest
- earns 8,500 RON net/month
- mother is 67
- mother receives a pension
- mother currently lives independently
- user has one sibling
- nobody in the family has discussed what happens if the mother eventually requires regular assistance
- user does not know how much care could cost
- user does not know how much their mother could cover herself
- user does not know how much they should prepare now

The emotional progression of the product should be:

**uncertainty → understanding → scenario → financial gap → family plan → confidence**

The product should NEVER use fear-mongering.

Use calm language such as:

- “Let’s understand what your family may need.”
- “This is an estimate, not a prediction.”
- “Small steps today can make future choices easier.”
- “You can adjust any assumption.”
- “Your plan can change as your family changes.”

---

# BRAND

Product name:

# Prototype123

Optional descriptor:

**Plan today. Be there tomorrow.**

Romanian alternative tagline:

**Ai grijă de viitor, înainte să devină o urgență.**

The product should feel:

- trustworthy
- warm
- modern
- calm
- human
- financially credible
- simple enough for non-financial users

Avoid making it look like:
- a bank
- an insurance website
- a hospital portal
- a government portal
- a crypto/fintech trading application

Create a clean fintech aesthetic with generous whitespace, rounded cards, subtle shadows, strong typography and excellent visual hierarchy.

Use a light background with restrained accent colors.

Use one warm accent for family/care concepts and one cooler financial accent.

Do not overuse gradients.

Use meaningful icons sparingly.

The application should look credible enough to be shown to judges as a real startup product.

---

# LANGUAGE

The primary interface should be in **Romanian**.

Use natural, conversational Romanian rather than bureaucratic financial terminology.

Important UI phrases include:

- “Planul familiei tale”
- “Despre părintele tău”
- “Cum ar putea evolua situația?”
- “Cost estimat”
- “Venit disponibil”
- “Diferență de acoperit”
- “Contribuția familiei”
- “Fond pentru îngrijire”
- “Ce se întâmplă dacă...?”
- “Construiește planul”
- “Pregătit”
- “Necesită atenție”
- “Estimare”
- “Pe lună”
- “Economisești de azi”
- “Pensie”
- “Economii”
- “Contribuția ta”
- “Contribuția fratelui/surorii”

For hackathon presentation purposes, optionally include a small RO / EN language toggle in the header.

Romanian should be selected by default.

---

# CORE APPLICATION STRUCTURE

Build the following experience:

1. Landing page
2. Parent onboarding
3. User/family financial onboarding
4. Financial future dashboard
5. Care scenario explorer
6. Funding-gap calculator
7. Family plan builder
8. “What if?” simulator
9. Family contribution / sibling coordination screen
10. Final action plan

The entire journey should feel like one connected experience.

---

# SCREEN 1 — LANDING PAGE

Create a strong hero section.

Headline:

**Știi cât te-ar costa dacă părinții tăi ar avea nevoie de tine?**

Subheadline:

**Prototype123 te ajută să înțelegi impactul financiar al îngrijirii unui părinte și să construiești un plan împreună cu familia, înainte ca situația să devină o urgență.**

Primary CTA:

**Construiește planul familiei**

Secondary CTA:

**Vezi cum funcționează**

Underneath, show three simple steps:

### 1. Înțelege
Estimăm cum s-ar putea schimba nevoile financiare ale părintelui tău.

### 2. Simulează
Compari diferite scenarii de îngrijire și vezi impactul asupra familiei.

### 3. Pregătește-te
Construiești un plan financiar împreună cu membrii familiei.

Also show a small trust message:

**Nu oferim diagnostic medical și nu prezicem viitorul. Construim scenarii financiare pe care le poți modifica.**

Do not require account creation for the hackathon prototype.

---

# SCREEN 2 — PARENT PROFILE

Create a friendly multi-step questionnaire.

Progress indicator:

**Pasul 1 din 4**

Heading:

**Spune-ne puțin despre părintele tău**

Fields:

### Basic information

First name:
Default demo value: Elena

Age:
Default: 67

Location:
Dropdown:
- București
- Cluj-Napoca
- Iași
- Timișoara
- Brașov
- Constanța
- Alt oraș
- Zonă rurală

Living situation:
- Locuiește singur(ă)
- Locuiește cu partenerul
- Locuiește cu mine
- Locuiește cu alt membru al familiei

Housing:
- Proprietar
- Chiriaș
- Altă situație

Current independence:

Use visually friendly selection cards:

**Independent**
“Se descurcă singur(ă) cu activitățile zilnice.”

**Are nevoie ocazional de ajutor**
“Transport, cumpărături, curățenie sau alte activități.”

**Are nevoie regulat de ajutor**
“Familia sau altcineva oferă deja sprijin frecvent.”

Do NOT ask for medical diagnoses.

Continue button:

**Continuă**

---

# SCREEN 3 — PARENT FINANCES

Progress:

**Pasul 2 din 4**

Heading:

**Ce resurse financiare are Elena astăzi?**

Inputs:

Monthly pension:
Default: 3,100 RON

Other monthly income:
Default: 0 RON

Accessible savings:
Default: 25,000 RON

Current monthly essential expenses:
Default: 2,600 RON

Optional assets:

- Owns home
- Other property
- Private pension
- Other savings

Add helpful tooltip:

**Nu trebuie să introduci valori exacte. O estimare este suficientă pentru primul plan.**

Automatically calculate:

Current monthly surplus:

pension + other income - essential expenses

Using demo values:

3,100 - 2,600 = 500 RON/month.

Show:

**Elena are aproximativ 500 RON/lună disponibili peste cheltuielile curente.**

---

# SCREEN 4 — YOUR FAMILY

Progress:

**Pasul 3 din 4**

Heading:

**Cine ar putea contribui dacă Elena ar avea nevoie de ajutor?**

Ask:

Your monthly net income:
Default: 8,500 RON

Your monthly savings:
Default: 1,000 RON

Number of siblings:
Default: 1

Generate sibling cards dynamically.

Example:

### Tu
Venit: 8,500 RON/lună

### Andrei
Contribution capacity:
Unknown initially

Allow:

**Adaugă un membru al familiei**

Possible family roles:
- Frate
- Soră
- Partener
- Alt membru al familiei

Then ask:

**Cât ai putea contribui confortabil dacă ar fi nevoie?**

Use a slider.

Default:
400 RON/month.

IMPORTANT:

Do not frame this as a commitment.

Text:

**Aceasta nu este o promisiune. Ne ajută doar să simulăm capacitatea familiei.**

---

# SCREEN 5 — TIME HORIZON

Progress:

**Pasul 4 din 4**

Heading:

**Hai să privim câțiva ani înainte**

Ask:

“What time horizon should we explore?”

Options:

5 years  
10 years  
15 years

Default:
10 years.

Then CTA:

**Vezi viitorul financiar al familiei**

Add a short transition/loading experience:

“Construim scenariile…”

“Estimăm resursele disponibile…”

“Calculăm diferențele de acoperit…”

This can be animated for approximately 1–2 seconds.

---

# SCREEN 6 — MAIN DASHBOARD

This should be the strongest visual screen in the entire product.

Header:

**Planul Elenei**

Subheading:

**O privire asupra posibilelor nevoi financiare în următorii 10 ani.**

At the top, show a summary card:

Current status:

**Astăzi**

Age:
67

Status:
Independent

Income:
3,100 RON/month

Available after essential expenses:
500 RON/month

Family contribution required:
0 RON/month

Then display a horizontal or vertical interactive timeline.

Example:

### ACUM — 67 ANI

Independent

Estimated additional care cost:
0 RON

Family gap:
0 RON

↓

### SCENARIUL 1 — 72 ANI

“Ajutor ocazional”

Possible support:
- transport
- groceries
- cleaning
- administrative support

Estimated additional monthly cost:
900 RON

Available from Elena:
500 RON

Estimated family gap:
**400 RON/month**

↓

### SCENARIUL 2 — 77 ANI

“Ajutor zilnic”

Possible support:
- daily home assistance
- transport
- meal assistance
- household support

Estimated additional monthly cost:
3,000 RON

Available from Elena:
1,300 RON

Estimated family gap:
**1,700 RON/month**

↓

Optional:

### SCENARIUL 3

“Îngrijire rezidențială”

Estimated cost:
5,000 RON/month

Estimated contribution from Elena:
3,100 RON

Family gap:
**1,900 RON/month**

IMPORTANT:

These numbers must be clearly labelled as editable demo assumptions.

Add label:

**Estimare demonstrativă**

Tooltip:

**Costurile reale variază în funcție de oraș, tipul serviciilor, disponibilitate și situația familiei.**

Never present the estimates as guaranteed factual prices.

---

# KEY VISUALIZATION — FAMILY GAP

Create a visually powerful chart/card showing:

## De unde vin banii?

Example for the daily-care scenario:

Estimated need:
3,000 RON/month

Parent's available contribution:
1,300 RON

Remaining:

# 1,700 RON/month

Label the remaining amount:

**Diferența de acoperit de familie**

Use a stacked horizontal bar:

Parent contribution | Family gap

Make the gap visually obvious but not frightening.

Below:

**Dacă Elena ar avea nevoie de acest nivel de ajutor astăzi, familia ar trebui să acopere aproximativ 1,700 RON în fiecare lună.**

CTA:

**Construiește un plan pentru această diferență**

---

# SCREEN 7 — CARE SCENARIO EXPLORER

Heading:

**Ce se întâmplă dacă...?**

Allow users to modify future assumptions.

Controls should include sliders/toggles.

### Care begins in:

3 years  
5 years  
10 years

### Care intensity:

- Ajutor ocazional
- Ajutor de câteva ori pe săptămână
- Ajutor zilnic
- Îngrijire rezidențială

### Estimated monthly cost

Editable slider/input.

Default values can be demo assumptions.

### Parent income at that point

Editable.

### Parent savings available

Editable.

Every change should instantly recalculate:

- total estimated cost
- amount parent can cover
- remaining family gap
- amount each sibling would need to contribute
- amount the user would need to save today

Make this interaction feel extremely responsive.

This live recalculation is one of the key features to demonstrate to hackathon judges.

---

# SCREEN 8 — FAMILY PLAN BUILDER

Heading:

# Cum acoperim diferența?

Example:

Projected future gap:

**1,700 RON/month**

Create contribution cards.

### Elena

Pension/resources:
1,300 RON already accounted for

### Tu

Monthly contribution:
400 RON

Slider:
0–2,000 RON

### Andrei

Monthly contribution:
400 RON

Slider:
0–2,000 RON

Remaining uncovered gap updates dynamically.

Example:

Gap:
1,700

User:
400

Sibling:
400

Remaining:
900 RON/month

Then introduce:

# Pregătește-te din timp

Ask:

**Cât ai putea economisi lunar de astăzi?**

Slider.

Default:
250 RON/month.

Then calculate a projected “Care Reserve”.

Use a simplified deterministic financial model for the hackathon.

For example:

Care reserve = monthly savings × number of months until target scenario.

Do NOT assume investment returns unless clearly enabled as an optional assumption.

If monthly savings = 250 RON and scenario is 10 years away:

250 × 120 months = 30,000 RON.

Display:

**Fond estimat peste 10 ani**

# 30,000 RON

Then translate this into an understandable benefit:

If future gap = 1,700 RON/month:

30,000 / 1,700 = approximately 17 months.

Display:

**Acest fond ar putea acoperi aproximativ 17 luni din diferența estimată.**

This is an extremely important feature.

Do not only show how much money is saved.

Translate it into:

**“How much future care does this buy my family?”**

---

# SCREEN 9 — “START NOW VS WAIT” COMPARISON

Create a visually compelling comparison.

Heading:

# Mai devreme înseamnă mai ușor

Cards:

### Începi astăzi

250 RON/month

10 years

30,000 RON reserve

Estimated coverage:
17 months of the funding gap

VERSUS

### Începi peste 5 ani

To reach the same 30,000 RON reserve:

500 RON/month

5 years

Add a strong but calm message:

**Pregătirea din timp poate transforma o cheltuială dificilă într-un efort lunar gestionabil.**

This should be a major “aha moment” in the demo.

---

# SCREEN 10 — FAMILY COORDINATION

This should be one of the features that differentiates Prototype123 from a simple calculator.

Heading:

# Nu trebuie să planifici singur

Text:

**Poți invita membrii familiei să spună cât ar putea contribui, fără să își dezvăluie toate veniturile sau economiile.**

Show a visual family group.

Example:

Elena — Parent

Maria — You

Andrei — Brother

Button:

**Invită un membru al familiei**

For the prototype, clicking this should open a modal with:

Name

Relationship

Email or phone — optional/mock only

Button:

**Generează invitație**

Then generate a simulated invitation link.

No actual email service is required unless straightforward to implement.

The invited person should see a very simple page:

# Maria construiește un plan pentru viitorul Elenei

**Dacă în viitor ar fi nevoie, ce contribuție lunară ar fi realistă pentru tine?**

Slider:

0–2,000 RON

Default:
400 RON

Options:

- Prefer să nu spun
- Pot contribui financiar
- Pot ajuta în alte moduri

This is important.

Not all care contribution is financial.

Allow:

**Pot ajuta cu timp**

Options:

- Transport
- Cumpărături
- Vizite
- Programări
- Administrarea facturilor
- Alte activități

For the MVP, non-financial support does not need a complex monetary valuation.

Simply display it in the final plan.

---

# SCREEN 11 — FINAL FAMILY PLAN

Heading:

# Planul familiei pentru Elena

Create an elegant summary.

Example:

Target scenario:

Daily assistance starting around age 77.

Estimated monthly care requirement:
3,000 RON

Parent resources:
1,300 RON

Family funding gap:
1,700 RON

Planned monthly contributions:

You:
400 RON

Andrei:
400 RON

Future care reserve:
900 RON equivalent/month initially available from savings

Plan status:

**Acoperire bună**

or

**Mai sunt 300 RON/lună de acoperit**

Use three plan statuses:

Green:
**Pregătit**

Amber:
**Aproape acoperit**

Red:
**Necesită atenție**

Do not use alarming language.

---

# ACTION CHECKLIST

Below the financial plan, generate a personalized checklist.

Example:

## Următorii pași

1. Discută planul cu Elena.
2. Invită-l pe Andrei în plan.
3. Pune deoparte 250 RON/lună pentru fondul de îngrijire.
4. Revedeți planul peste 12 luni.
5. Actualizează estimările dacă situația familiei se schimbă.

Add checkboxes.

Allow user to mark actions complete.

Store state locally or with Supabase if implemented.

---

# CORE CALCULATION ENGINE

Implement calculations clearly in the code.

Variables:

parentMonthlyIncome

parentEssentialExpenses

parentAvailableIncome =
parentMonthlyIncome - parentEssentialExpenses

careMonthlyCost

parentCareContribution

familyFundingGap =
max(0, careMonthlyCost - parentCareContribution)

userContribution

siblingContributions

remainingGap =
max(
0,
familyFundingGap -
userContribution -
sum(siblingContributions)
)

monthlyPreparationSaving

monthsUntilScenario

futureCareReserve =
monthlyPreparationSaving × monthsUntilScenario

monthsOfGapCovered =
futureCareReserve / familyFundingGap

Handle division-by-zero gracefully.

Also calculate:

requiredMonthlySavingForTargetReserve =
targetReserve / monthsUntilScenario

Use RON formatting everywhere.

Example:

1.700 RON

not:

1700 RON

Use Romanian numeric formatting.

---

# SCENARIO ASSUMPTIONS

Create a central configuration object for all demo assumptions so they can easily be changed later.

Example:

occasionalCare:
900 RON/month

frequentCare:
1,800 RON/month

dailyCare:
3,000 RON/month

residentialCare:
5,000 RON/month

IMPORTANT:

These are HACKATHON DEMO ASSUMPTIONS.

Place a visible “How we estimate” information panel.

Text:

# Cum facem estimările?

**Prototype123 folosește scenarii orientative pentru a ajuta familiile să înțeleagă ordinul de mărime al unei posibile nevoi financiare. Costurile reale pot varia semnificativ în funcție de locație, tipul serviciilor, evoluția prețurilor și situația personală.**

Include:

**Nu reprezintă consultanță financiară, medicală sau juridică.**

Architect the application so these assumptions could later come from verified Romanian datasets or APIs.

---

# IMPORTANT: EXPLAIN EVERY NUMBER

Whenever the application displays a major financial number, allow the user to click:

**Cum am calculat?**

Example:

For:

**Diferență: 1.700 RON/lună**

Modal:

Estimated care cost:
3,000 RON

Parent available contribution:
−1,300 RON

Estimated family gap:
= 1,700 RON

Transparency is extremely important.

Users should never wonder where a number came from.

---

# DASHBOARD TOP METRICS

Show four key cards:

### Părinte
Elena, 67

### Orizont analizat
10 ani

### Posibilă diferență lunară
1,700 RON

### Fond planificat
30,000 RON

Do not overwhelm the dashboard with too many KPIs.

---

# OPTIONAL FINANCIAL HEALTH INDICATOR

Create a simple indicator:

# Grad de pregătire

For example:

68%

Explain exactly what it means.

Suggested calculation:

coveredResources / projectedNeed

Never imply that this is an official financial score.

Label:

**Indicator Prototype123**

Tooltip:

**Un indicator intern care arată cât din scenariul selectat este acoperit de planul actual.**

---

# VISUALIZATIONS

Include visually strong charts, but keep them simple.

Use Recharts if appropriate.

Charts:

1. Care cost vs parent resources vs family gap
2. Family contribution breakdown
3. Care reserve growth over time
4. “Start today vs start later”
5. Timeline of parent scenarios

Avoid stock-market style charts.

The graphs should explain a story rather than simply display data.

---

# NAVIGATION

Desktop navigation:

Prototype123 logo

Planul meu

Scenarii

Familie

Cum funcționează

Profile/avatar icon

On mobile, use a compact bottom navigation:

Plan

Scenarii

Familie

---

# TECH STACK

Use:

- React
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Lucide icons
- Recharts for visualizations

Use clean reusable components.

Suggested components:

ParentProfileForm

FinancialProfileForm

FamilyMemberCard

CareTimeline

ScenarioCard

FundingGapCard

ContributionSlider

ReserveProjection

ScenarioSimulator

CalculationExplanationModal

FamilyPlanSummary

ActionChecklist

Use appropriate TypeScript interfaces.

Example:

ParentProfile

FamilyMember

CareScenario

FinancialPlan

PlanAssumptions

---

# DATA PERSISTENCE

For the hackathon MVP:

Prefer simple local persistence so the demo cannot break.

Use localStorage for:
- parent profile
- user values
- family members
- selected scenario
- contribution assumptions
- checklist progress

If Supabase is already configured and stable, it can optionally store profiles and plans.

Do NOT make authentication a blocker for the demo.

Include a:

**Încearcă un exemplu**

button on the landing page.

This should instantly load the Elena demo profile.

This is essential for judges.

---

# DEMO PROFILE

Preload this complete demo:

Parent:
Elena

Age:
67

Location:
Bucharest

Lives:
Alone

Housing:
Own home

Current state:
Independent

Pension:
3,100 RON/month

Other income:
0

Essential expenses:
2,600 RON

Savings:
25,000 RON

User:
Maria

Age:
36

Net income:
8,500 RON/month

Possible care contribution:
400 RON/month

Sibling:
Andrei

Possible contribution:
400 RON/month

Target horizon:
10 years

Selected scenario:
Daily assistance

Estimated care cost:
3,000 RON/month

Parent contribution in this scenario:
1,300 RON/month

Family gap:
1,700 RON/month

Monthly preparation savings:
250 RON

Reserve after 10 years:
30,000 RON

Estimated months of gap covered:
approximately 17 months

Use this scenario consistently across the application.

---

# IMPORTANT HACKATHON DEMO FLOW

Optimize the application so someone can demonstrate the core value in roughly 2–3 minutes.

Ideal demo:

1. Landing page

“Most of us plan for our own retirement. But what happens when our parents need us?”

2. Click:

**Încearcă exemplul Elenei**

3. Show future timeline.

“Elena is independent today.”

4. Click scenario:

**Ajutor zilnic la 77 ani**

5. Reveal:

3,000 RON required

1,300 RON covered by Elena

**1,700 RON family gap**

6. Change scenario assumptions.

Move care requirement earlier.

The gap dynamically changes.

7. Open Family Plan.

Maria:
400

Andrei:
400

Remaining gap:
900

8. Add:

250 RON saved today.

Show:

30,000 RON reserve in ten years.

9. Show:

Start now:
250 RON/month

Wait five years:
500 RON/month

10. Finish on:

**Planul familiei**

This should produce the emotional conclusion:

“Instead of discovering the cost during a crisis, the family sees it years earlier and can prepare together.”

---

# UX DETAILS

Use subtle transitions when numbers update.

Animate major calculation changes.

For example, when family gap changes from 1,700 to 900 RON, animate the number instead of instantly replacing it.

Sliders should have immediate feedback.

Every major card should have clear hierarchy:

Label

Large number

Short explanation

Avoid giant blocks of text.

Use tooltips for complex terms.

Use icons for:
- parent
- home
- pension
- savings
- family
- calendar
- care
- planning

Ensure excellent mobile responsiveness.

---

# ACCESSIBILITY

Use:

- strong text contrast
- readable minimum font sizes
- keyboard-accessible controls
- proper input labels
- semantic HTML
- visible focus states
- no information conveyed only through color

Important because the product deals with users across different age groups.

---

# PRIVACY

Because this involves family financial information, add privacy cues throughout the interface.

Example:

**Datele tale financiare rămân private.**

For the prototype, explicitly state:

**Acest prototip salvează informațiile doar local în browser.**

Do not imply bank-grade security unless actually implemented.

---

# EMPTY STATES AND ERROR HANDLING

Make the application feel complete.

If data is missing:

**Adaugă venitul părintelui pentru a calcula scenariul.**

If no siblings exist:

**Poți construi planul singur sau poți adăuga ulterior alți membri ai familiei.**

If there is no family funding gap:

Celebrate subtly:

**În acest scenariu, resursele estimate ale părintelui acoperă costul.**

Do not show negative numbers.

---

# WHAT NOT TO BUILD

Do NOT add:

- expense transaction tracking
- bank synchronization
- stock recommendations
- cryptocurrency
- generic AI chatbot
- budgeting categories
- credit score
- loan marketplace
- insurance marketplace
- medical diagnosis
- medication tracking
- hospital search
- social feed
- gamification points
- unnecessary account settings

Every feature must answer:

**Does this help a Romanian family understand or prepare for the financial consequences of caring for an aging parent?**

If not, do not include it.

---

# OPTIONAL AI FEATURE

Only if the core product is fully functional, add one small AI-style feature:

# Explică-mi planul

The user can click a button and receive a plain-language summary generated from the existing numbers.

Example:

**“În scenariul selectat, Elena ar avea nevoie de aproximativ 3.000 RON pe lună pentru sprijin. Din veniturile și resursele ei ar putea acoperi aproximativ 1.300 RON. Maria și Andrei intenționează să contribuie împreună cu 800 RON, ceea ce lasă o diferență de aproximativ 900 RON pe lună. Dacă Maria economisește 250 RON lunar timp de 10 ani, familia ar construi un fond de aproximativ 30.000 RON.”**

Do not create a general chatbot.

---

# FUTURE PRODUCT VISION

The MVP should visually imply that this could eventually support:

- verified Romanian care-cost datasets
- pension projections
- inflation-adjusted care costs
- public benefits and eligibility
- private care options
- family collaboration
- recurring yearly plan reviews
- secure bank integrations
- professional financial guidance

But DO NOT implement these unless necessary.

The hackathon prototype should stay focused.

---

# SUCCESS CRITERIA

The finished application should make a user understand the product's value within 30 seconds.

A judge should immediately be able to answer:

### Who is this for?

Romanians with aging parents.

### What problem does it solve?

Families do not know the future financial burden of caring for a parent until the need becomes urgent.

### What does Prototype123 do?

It turns possible future care situations into financial scenarios, identifies the funding gap, and helps families prepare together.

### Why isn't this just another financial calculator?

Because it combines:

- future scenario planning
- parent resources
- family financial capacity
- sibling coordination
- preparation over time
- interactive “what if?” analysis

around one specific life event.

The most important screen in the entire application is the moment where:

**3,000 RON estimated need**

minus

**1,300 RON parent resources**

equals

# **1,700 RON family gap**

and the user then sees how decisions made today can reduce that gap.

Build the product around making that moment exceptionally clear.

---

# FINAL BUILD PRIORITY

If time is constrained, prioritize in exactly this order:

1. Beautiful landing page
2. Demo profile
3. Parent/family onboarding
4. Future care timeline
5. Funding-gap calculation
6. Interactive scenario simulator
7. Contribution sliders
8. “Start today vs wait” calculation
9. Final family plan
10. Family invitation prototype
11. Everything else

The prototype must prioritize **clarity and emotional impact over feature count**.

The finished application should feel like a credible Romanian fintech startup concept, not a hackathon dashboard.

Build all screens and interactions necessary for the full demo flow.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bc8a6723-1257-43fe-ab4f-1693a4e9d786).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
