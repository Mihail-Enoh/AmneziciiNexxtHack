# WeCare

**Ei au avut grijă de tine. Acum e rândul tău.**

WeCare ajută adulții din România să afle **din timp** cât ar putea costa îngrijirea unui părinte în vârstă, cât poate acoperi părintele din pensie și economii, ce rămâne de acoperit de familie și cum se poate împărți acest efort între frați.

Proiect realizat de echipa **Amnezicii** la **NEXXT AI Summit Hackathon** (București, 28–29 octombrie 2026), provocarea Stripe *Rethinking Financial Futures*.

> Estimări pentru planificare, nu sfat financiar sau medical.

---

## Cuprins

1. [Pornire rapidă](#pornire-rapidă)
2. [Ce face aplicația](#ce-face-aplicația)
3. [Paginile aplicației](#paginile-aplicației)
4. [Cum folosim AI-ul](#cum-folosim-ai-ul)
5. [Cum calculăm](#cum-calculăm)
6. [Date personale și confidențialitate](#date-personale-și-confidențialitate)
7. [Arhitectură și tehnologii](#arhitectură-și-tehnologii)
8. [Structura proiectului](#structura-proiectului)
9. [Configurare](#configurare)
10. [Comenzi utile](#comenzi-utile)
11. [Teste](#teste)
12. [Lucrul cu Lovable și GitHub](#lucrul-cu-lovable-și-github)
13. [Probleme frecvente](#probleme-frecvente)
14. [Limitări cunoscute](#limitări-cunoscute)
15. [Surse](#surse)

---

## Pornire rapidă

Scriptul de instalare pornește aplicația **pe o mașină goală**: instalează ce lipsește (Bun, Node.js, dependențele), cere opțional cheia pentru AI, pornește serverul, verifică faptul că pagina răspunde și deschide browserul.

### Linux, macOS sau Windows cu WSL

Din folderul proiectului:

```bash
bash setup.sh
```

La final apare `WeCare rulează: http://127.0.0.1:8080/`. Oprești aplicația cu `Ctrl+C`. Data viitoare rulezi aceeași comandă: ce e deja instalat nu se mai instalează, așa că pornirea durează câteva secunde.

| Opțiune | Ce face |
|---|---|
| `--check` | rulează întâi toate testele și build-ul de producție |
| `--no-ai` | nu cere cheia Featherless; aplicația merge, fără funcțiile AI |
| `--port 3000` | alt port (implicit 8080; dacă e ocupat, îl folosește pe următorul liber) |
| `--no-open` | nu deschide browserul |
| `--reset-key` | cere din nou cheia Featherless |

### Windows (fără WSL)

Dublu-click pe **`setup.cmd`**. Fișierul pornește `setup.ps1` și ocolește blocarea „is not digitally signed” pe care Windows o pune pe scripturile descărcate de pe internet.

Echivalent, dintr-o fereastră PowerShell deschisă în folderul proiectului:

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

Nu folosi „Run with PowerShell” din meniul de click dreapta: pe multe calculatoare se oprește cu „not digitally signed”.

Acceptă aceleași opțiuni: `-Check`, `-NoAI`, `-Port 3000`, `-NoOpen`, `-ResetKey`. Pe Windows, varianta testată cel mai bine rămâne WSL (Ubuntu) cu `setup.sh`.

### Ce instalează scriptul

| Ce | Unde | De ce |
|---|---|---|
| `curl`, `unzip`, `tar` (doar dacă lipsesc) | prin managerul de pachete al sistemului (apt, dnf, pacman, zypper, apk, brew); poate cere parola | descărcări și dezarhivare |
| Bun 1.4.4 | `~/.bun/bin` | instalează pachetele și rulează scripturile |
| Node.js 22.23.4 (doar dacă lipsește sau e mai vechi de 22.12) | `~/.local/share/wecare-node` | Vite și testele au nevoie de Node |
| dependențele proiectului | `node_modules/` | exact versiunile din `bun.lock` |
| cheia Featherless (opțional) | `.env.featherless.local` (permisiuni 600) | funcțiile AI; fișierul e ignorat de git |

Nimic nu se instalează global în sistem, cu excepția uneltelor de bază de mai sus. Scriptul a fost testat pe o mașină Linux fără Bun și fără Node: instalare, 159 de teste, build și pornire.

### Pornire manuală (dacă ai deja Bun și Node 22)

```bash
bun install                      # instalează dependențele
export FEATHERLESS_API_KEY=...   # opțional, pentru AI
bun run dev --port 8080 --host 127.0.0.1
```

---

## Ce face aplicația

- **Plan financiar al familiei.** Afli cât ar costa îngrijirea, cât acoperă părintele (pensie, alte venituri, economii, chirii, pensie privată) și diferența lunară rămasă pentru familie.
- **Pornire din povestea ta.** Scrii în câteva rânduri situația („Tata are 80 de ani, pensie 1.800 lei…”), iar AI-ul completează formularul. Tot ce a înțeles e afișat, ca să poți corecta.
- **Mai multe persoane.** Poți face planuri pentru mai mulți părinți sau bunici și treci ușor de la unul la altul.
- **Scenarii.** Schimbi tipul îngrijirii (ocazional, de câteva ori pe săptămână, zilnic, rezidențial), momentul începerii, costul și resursele, iar totul se recalculează pe loc.
- **Costul, explicat.** Costul lunar e împărțit pe categorii (îngrijitoare, masă, transport, cazare…) într-un grafic editabil. Ce plătea persoana oricum (de exemplu masa) nu se numără de două ori.
- **Familia.** Împarți diferența între frați, inviți rudele să spună cât pot contribui și vezi cât să pui deoparte de azi.
- **Sănătate și obiceiuri** (opțional): o poveste, un chestionar scurt, analize medicale citite automat din poze sau PDF, apoi:
  - când ar putea fi nevoie de ajutor zilnic (cel mai probabil an și un interval);
  - ce ar putea costa familia;
  - ce obiceiuri ar putea amâna nevoia de îngrijire și cu cât.
- **Cont opțional.** Fără cont, datele dispar când închizi tab-ul. Cu cont, planurile rămân salvate pe acel calculator.

---

## Paginile aplicației

| Adresă | Pagină | Ce găsești |
|---|---|---|
| `/` | Prima pagină | povestea pentru AI, „Pas cu pas”, intrarea la Sănătate |
| `/start` | Construiește planul | formular în 4 pași: persoana, venituri și bunuri, cine contribuie, când începe |
| `/plan` | Planul meu | diferența lunară, cine acoperă ce, proiecția în timp, prognoza |
| `/scenarii` | Scenarii | simulator: tip de îngrijire, cost, venituri, economii, graficul costului, „Mai devreme înseamnă mai ușor” |
| `/familie` | Familie | contribuții pe membri, invitații, fondul de îngrijire |
| `/rezumat` | Planul final | rezumat și pașii următori |
| `/sanatate` | Sănătate și obiceiuri | povestea, chestionarul, acordul, documentele, verificarea analizelor, rezultatul |
| `/cum-functioneaza` | Cum funcționează | ipotezele și explicațiile calculelor |
| `/cum-folosim-datele` | Cum folosim datele | confidențialitate |
| `/invitatie` | Invitație | pagina pe care o deschide un membru al familiei invitat |
| `/auth`, `/reset-password` | Cont | autentificare cu email și parolă |

---

## Cum folosim AI-ul

Principiul: **AI-ul înțelege, codul verifică, motorul calculează.** AI-ul nu produce niciodată cifrele afișate; doar extrage informații din text sau imagini, iar acestea trec prin validare strictă înainte să ajungă în plan.

| Funcție | Model (implicit) | Ce primește | Ce întoarce | Fișiere |
|---|---|---|---|---|
| Povestea de pe prima pagină | `Qwen/Qwen3-235B-A22B` | textul scris de utilizator (max. 600 de caractere) | câmpuri de plan (vârstă, pensie, cheltuieli, contribuții…) | `src/lib/intake*.ts` |
| Citirea analizelor | `Qwen/Qwen2.5-VL-72B-Instruct` | imaginea unei pagini (poză sau PDF, max. 3 pagini) | lista de analize: nume, valoare, unitate, interval | `src/lib/health.functions.ts`, `src/lib/health.ts` |
| Interpretarea de sănătate | `Qwen/Qwen3-235B-A22B` | povestea, răspunsurile la chestionar, analizele verificate | un rezumat și semnale pe domenii (mobilitate, memorie…) | `src/lib/health-prompt.ts`, `src/lib/health.ts` |

Detalii:

- **Furnizor:** [Featherless](https://featherless.ai), API compatibil OpenAI. Toate apelurile trec prin `src/lib/featherless.ts`.
- **Model de rezervă:** dacă modelul de text nu răspunde (eroare, model indisponibil, răspuns inutilizabil), se încearcă automat modelul de imagini, care citește și text.
- **Fără „gândire” la Qwen3:** se trimite `/no_think`, ca tot răspunsul să fie JSON-ul cerut.
- **Validare:** fiecare răspuns e curățat cu `zod`. Câmpurile necunoscute se ignoră, valorile se limitează la intervale plauzibile, iar tot ce a completat AI-ul e arătat utilizatorului.
- **Când AI-ul nu merge:** aplicația continuă. Formularul se completează manual, analizele se adaugă de mână, iar rezultatul de sănătate se calculează doar din chestionar și analize. Mesajul spune motivul (de exemplu „lipsește cheia”, „serviciul AI a răspuns prea greu”).
- **Un singur apel odată** către Featherless (limita de concurență a contului).
- **Nimic nu se salvează pe server:** nici poveștile, nici imaginile, nici cheia nu apar în jurnale.

Script de diagnosticare pentru AI, în afara aplicației:

```bash
FEATHERLESS_API_KEY=... FEATHERLESS_MODEL=Qwen/Qwen3-235B-A22B bun scripts/test-intake.ts "Tata are 80 de ani..."
```

---

## Cum calculăm

Toate formulele sunt în cod, acoperite de teste. Cifrele sunt **în prețurile de azi**, dacă nu alegi o creștere anuală a costurilor.

### Diferența lunară (`src/lib/plan.ts`)

```
diferența pentru familie = costul îngrijirii
                         − pensia și veniturile persoanei
                         + cheltuielile ei care rămân
                         − partea lunară din economii
```

- **Costul îngrijirii** vine din scenariul ales: ocazional 900, de câteva ori pe săptămână 1.800, zilnic 3.000, rezidențial 5.000 lei/lună. Sunt **valori demonstrative**, editabile pe categorii în pagina Scenarii.
- **Cheltuielile care rămân:** din cheltuielile lunare ale persoanei se scade ce include deja îngrijirea (categoriile marcate „Deja inclusă în cheltuielile lunare actuale”). Implicit: masa (300 lei la „câteva ori pe săptămână”, 800 lei la „zilnic”) și cazare, masă și utilități (2.600 lei) la îngrijirea rezidențială.
- **Economiile** se folosesc eșalonat pe un număr de luni (implicit 60).
- **Familia:** contribuțiile promise acoperă diferența. „Mai devreme înseamnă mai ușor” arată cât trebuie pus deoparte lunar ca partea familiei să fie strânsă până începe îngrijirea: dacă începi azi, comparativ cu peste 5 ani.

### Când ar putea fi nevoie de ajutor zilnic (`src/lib/forecast.ts`)

- **Curba de risc pe vârstă (Gompertz):** riscul anual = `0,03303 · e^(0,1 · (vârsta − 65))`. Riscul se înmulțește cu factori din chestionar, analize și poveste.
- Rezultatul e **anul cel mai probabil** (mediana) și un **interval** (percentilele 40–60), nu o dată fixă.
- **Costul mediu așteptat:** costul fiecărui an posibil de început, înmulțit cu șansa ca îngrijirea să înceapă atunci.

### Efectul obiceiurilor (`src/lib/habit-evidence.ts`)

Fiecare obicei are un **risc relativ** (`hr`) și o **reversibilitate** (`reversible`): cât din riscul în plus dispare dacă obiceiul se schimbă acum, la vârsta înaintată.

| Obicei | Risc anual (maxim) | Reversibil | Sursa principală |
|---|---|---|---|
| Fără mișcare | ×2,0 | 0,3 | Tak et al. 2013, meta-analiză; studiul LIFE 2014 |
| Fumat zilnic | ×1,6 | 0,25 | Klijs et al. 2011; Tobacco Control 2025 (foști fumători) |
| Izolare socială | ×1,4 | 0,3 | Shankar et al. 2017 (ELSA) |
| Alcool zilnic | ×1,15 | 0,5 | Lang et al. 2007 (HRS, ELSA) |

- Cardurile arată **amânarea totală** dacă se schimbă toate obiceiurile, împărțită între obiceiuri după greutatea fiecăruia. Valorile se adună exact.
- Amânările scurte se afișează în săptămâni, cele lungi în luni.
- Suma afișată reprezintă **plăți amânate**: luni de amânare × diferența lunară.
- Valorile se modifică doar în `src/lib/habit-evidence.ts`; sursele sunt în comentariile fișierului.

### Ce **nu** face modelul

Nu e un diagnostic și nu prezice viitorul unei persoane anume. Prezintă scenarii pentru planificare, pe baza unor date populaționale aplicate orientativ.

---

## Date personale și confidențialitate

- **Fără cont:** planurile sunt ținute doar în tab-ul curent (`sessionStorage`) și dispar când îl închizi.
- **Cu cont:** planurile sunt salvate în browserul de pe acel calculator (`localStorage`), separat pentru fiecare cont. La autentificare, persoanele adăugate înainte trec în cont.
- **Serverul nu păstrează planuri.** Baza de date (Supabase) conține doar profilul contului: id și nume afișat, protejate prin Row Level Security.
- **Documentele medicale:**
  - se încarcă doar după un **acord explicit**, conform GDPR art. 9 (date despre sănătate);
  - sunt trimise doar serviciului de citire automată, fără să fie salvate;
  - aplicația cere să fie acoperite numele, CNP-ul și adresa înainte de fotografiere;
  - pentru demonstrație există un **buletin de analize fictiv**.
- **Sănătatea e separată pe persoană:** răspunsurile pentru o persoană nu apar la alta.
- **Încadrare:** aplicația produce „scenarii de îngrijire pentru planificare financiară”, nu evaluări medicale; peste tot recomandă discuția cu medicul.

---

## Arhitectură și tehnologii

```
Browser (React 19 + TanStack Router)
  │  pagini în src/routes, componente în src/components
  │  starea planului: src/lib/store.ts (sessionStorage / localStorage)
  │  calcule: src/lib/plan.ts, src/lib/forecast.ts (rulează în browser)
  │
  ├─ funcții de server (TanStack Start, createServerFn)
  │     src/lib/intake.functions.ts   → Featherless (text)
  │     src/lib/health.functions.ts   → Featherless (imagine, text)
  │
  └─ Supabase (Lovable Cloud): autentificare email + tabelul profiles
```

| Zonă | Tehnologie |
|---|---|
| Framework | TanStack Start (React 19, SSR), rute pe fișiere |
| Build | Vite 8, Nitro (țintă Cloudflare) |
| Stil | Tailwind CSS 4, componente shadcn/ui (Radix) |
| Grafice | Recharts |
| Validare | zod |
| PDF | pdf.js (încărcat doar la nevoie, în browser) |
| Autentificare | Supabase Auth |
| AI | Featherless, modele Qwen (text și imagine) |
| Teste | Vitest + Testing Library + jsdom |
| Pachete | Bun |
| Editare vizuală | Lovable, sincronizat cu GitHub |

---

## Structura proiectului

```
setup.sh, setup.ps1, setup.cmd  instalare și pornire pe o mașină goală (setup.cmd = dublu-click pe Windows)
src/
  routes/                     paginile (o rută pe fișier; __root.tsx = învelișul aplicației)
  components/
    app/                      componente generale: meniul, selectorul de persoane, graficul costurilor,
                              sliderele de sume, explicațiile „Cum am calculat?”
    health/                   fluxul Sănătate și obiceiuri: încărcare documente, verificare analize,
                              rezultat, prognoză, acord
    ui/                       componente de bază (shadcn/ui)
  lib/
    plan.ts                   motorul de calcul al planului (costuri, diferențe, proiecții)
    forecast.ts               prognoza: când, cât, efectul obiceiurilor
    habit-evidence.ts         riscurile obiceiurilor + surse (fișierul de editat pentru valori)
    health.ts                 chestionarul, analizele, regulile de sănătate
    health.functions.ts       funcțiile de server pentru citirea documentelor și interpretare
    health-prompt.ts          instrucțiunile pentru AI (sănătate)
    intake.ts                 transformă răspunsul AI într-un plan sigur
    intake.functions.ts       funcția de server pentru povestea de pe prima pagină
    intake-prompt.ts          instrucțiunile pentru AI (poveste)
    featherless.ts            apelurile către Featherless (model de rezervă, fără „gândire”)
    store.ts                  persoanele și planurile, salvarea pe tab sau pe cont
    *.test.ts                 teste
  integrations/supabase/      clientul Supabase (generat de Lovable)
  test/                       teste de interfață și de flux
public/demo/                  buletinul de analize fictiv
drizzle/, supabase/           schema bazei de date (tabelul profiles)
scripts/test-intake.ts        diagnosticare AI din terminal
docs/specificatie-initiala.md specificația inițială a produsului
```

---

## Configurare

### Variabile de mediu

| Variabilă | Unde | Obligatorie | Rol |
|---|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | `.env` (în repo) | da | autentificarea în browser; cheia e publică (publishable) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` | `.env` (în repo) | da | autentificarea pe server |
| `FEATHERLESS_API_KEY` | local: `.env.featherless.local` sau terminalul; online: Lovable → Cloud → Secrets | pentru AI | cheia Featherless |
| `FEATHERLESS_MODEL` | la fel | nu (implicit `Qwen/Qwen3-235B-A22B`) | modelul de text |
| `FEATHERLESS_VISION_MODEL` | la fel | nu (implicit `Qwen/Qwen2.5-VL-72B-Instruct`) | modelul de imagini |

Reguli:

- **Cheile Featherless nu se pun niciodată în repo, în prompturi Lovable sau în chat.**
- `.env.featherless.local` e ignorat de git (regula `*.local`).
- Valorile se curăță automat de spații sau rânduri noi lipite din greșeală.

### Valori de calcul

| Ce | Unde |
|---|---|
| costurile pe scenarii și categorii | `src/lib/plan.ts` (`PLAN_ASSUMPTIONS`, `DEFAULT_BREAKDOWN`) |
| riscurile obiceiurilor | `src/lib/habit-evidence.ts` |
| curba de risc, intervalul, dobânda pentru economisire | `src/lib/forecast.ts` (`FORECAST_ASSUMPTIONS`) |

---

## Comenzi utile

Toate se rulează din folderul proiectului.

| Comandă | Ce face |
|---|---|
| `bash setup.sh` | instalează ce lipsește și pornește aplicația |
| `bun run dev --port 8080 --host 127.0.0.1` | pornește serverul de dezvoltare (se reîncarcă la fiecare modificare) |
| `bun run test` | rulează toate testele (o dată) |
| `bun run test:watch` | rulează testele la fiecare modificare |
| `bun run build` | build de producție |
| `bun run preview` | servește build-ul de producție local |
| `bun run lint` | verifică stilul codului |
| `bunx tsc -p . --noEmit` | verifică tipurile TypeScript |

---

## Teste

```bash
bun run test
```

Rezultat așteptat: **159 de teste trecute** în 18 fișiere. Ce acoperă:

- **Motorul de calcul:** diferența lunară, bunurile, categoriile de cost și ce e deja inclus, proiecțiile, „Mai devreme înseamnă mai ușor”.
- **Prognoza:**
  - consistența cu pagina planului;
  - efectul obiceiurilor: valorile se adună exact, săptămâni sau luni;
  - fumatul cântărește mai mult decât alcoolul.
- **AI:**
  - povestea, cu răspunsuri simulate: cheie lipsă, model indisponibil și trecerea pe modelul de rezervă, blocul `<think>`;
  - validarea câmpurilor;
  - numele persoanei.
- **Sănătate:**
  - chestionarul („Niciuna” exclusiv, afecțiuni proprii);
  - analize duplicate, aceeași analiză din documente diferite;
  - documente încărcate de două ori;
  - acordul pe persoană.
- **Persoane și salvare:**
  - mai multe persoane;
  - mutarea planurilor vechi;
  - vizitator în tab, autentificare și deconectare.
- **Interfață:** data de început („Acum”, fără date trecute), sumele limitate la venit, rutele.

---

## Lucrul cu Lovable și GitHub

Proiectul e conectat la [Lovable](https://lovable.dev) prin GitHub, iar sincronizarea merge în ambele sensuri pe ramura `main`.

- **Nu rescrieți istoria publicată:** fără `force push`, `rebase` sau `amend` pe commit-uri deja împinse (vezi `AGENTS.md`).
- **O singură persoană dă prompturi lui Lovable odată.** Înainte de un prompt, `git pull` și `git push` pentru tot ce e local.
- **Lovable nu modifică logica.** `src/lib/intake*.ts`, `src/lib/health*.ts`, `src/lib/forecast*.ts`, `src/lib/featherless.ts`, `src/lib/habit-evidence.ts` și `src/lib/store.ts` se schimbă doar cu teste. Lovable lucrează pe interfață și pe baza de date.
- **După orice schimbare:** `bun run test` și `bun run build`.

---

## Probleme frecvente

| Simptom | Cauză și soluție |
|---|---|
| `bun: command not found` după instalare | deschide un terminal nou sau rulează `source ~/.bashrc` |
| „Nu am putut citi povestea (lipsește cheia FEATHERLESS_API_KEY pe server)” | rulează `bash setup.sh --reset-key` și lipește cheia; online, adaug-o în Lovable → Cloud → Secrets |
| „…(cheia API nu este acceptată)” | cheie greșită sau expirată; verific-o în contul Featherless |
| „…(serviciul AI este ocupat)” / „…a răspuns prea greu” | limita de concurență sau model încărcat; încearcă peste un minut |
| Analizele nu sunt citite dintr-o poză | fotografia trebuie să fie clară și dreaptă; încearcă „Folosește un buletin demonstrativ” ca să verifici că serviciul merge |
| „Documentul a fost deja citit” | e deja în lista de analize; „Începe din nou” golește lista |
| `EAFNOSUPPORT` / serverul nu pornește pe `::` | pornește cu `--host 127.0.0.1` (scriptul o face deja) |
| Portul 8080 e ocupat | scriptul alege automat următorul port liber; sau `--port 3000` |
| `Cannot find module 'pdfjs-dist'` sau alt modul | `bun install` |
| Testele pică doar pe mașina ta | verifică `node -v` (minim 22.12); scriptul instalează versiunea potrivită |
| După închiderea tab-ului persoanele au dispărut | așa funcționează fără cont; autentifică-te ca să le păstrezi |

---

## Limitări cunoscute

- **Costurile sunt demonstrative** și la fel pentru toată țara; pentru un plan real se pun prețurile din oferte locale.
- **Riscurile obiceiurilor** sunt aplicate orientativ, din studii pe populații; nu țin cont de cantitate (de exemplu câte țigări).
- **Planurile salvate în cont rămân doar pe calculatorul respectiv;** nu se sincronizează între dispozitive.
- **Invitațiile** funcționează prin link, fără trimitere automată de email.
- **Citirea documentelor** depinde de calitatea pozei și de modelul de imagini; valorile trebuie verificate de utilizator, iar aplicația cere asta explicit.

---

## Surse

- Tak, E. et al. (2013). *Prevention of onset and progression of basic ADL disability in community dwelling older adults: a meta-analysis.* Ageing Research Reviews 12(1):329–338. doi:10.1016/j.arr.2012.10.001
- Pahor, M. et al. (2014). *Effect of structured physical activity on prevention of major mobility disability in older adults: the LIFE study.* JAMA 311(23):2387–2396.
- Klijs, B., Mackenbach, J. P., Kunst, A. E. (2011). *Obesity, smoking, alcohol consumption and years lived with disability.* BMC Public Health 11:378. doi:10.1186/1471-2458-11-378
- Zaninotto, P., Head, J., Steptoe, A. (2020). *Behavioural risk factors and healthy life expectancy: evidence from two longitudinal studies of ageing in England and the US.* Scientific Reports 10:6955. doi:10.1038/s41598-020-63843-6
- Mehta, N., Myrskylä, M. (2017). *The population health benefits of a healthy lifestyle: life expectancy increased and onset of disability delayed.* Health Affairs 36(8).
- Lang, I. et al. (2007). *What level of alcohol consumption is hazardous for older people? Functioning and mortality in U.S. and English national cohorts.* Journal of the American Geriatrics Society 55(1):49–57.
- Shankar, A. et al. (2017). *Social isolation and loneliness: prospective associations with functional status in older adults.* Health Psychology 36(2):179–187.
- *Estimating the prevalence of disability among adults in the USA who smoke cigarettes, 2019–2023.* Tobacco Control (2025). doi:10.1136/tc-2024-059027
- Masi, C. M. et al. (2011). *A meta-analysis of interventions to reduce loneliness.* Personality and Social Psychology Review 15(3):219–266.
- Inflație și dobânzi: INS (inflația anuală, septembrie 2026), BNR (ținta de inflație), titlurile de stat Tezaur (octombrie 2026).