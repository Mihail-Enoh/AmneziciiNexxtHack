# WeCare: scoate din aplicație mesajele de tip „poți modifica în X” și „valori demonstrative”.
# Schimbă DOAR texte afișate; nicio funcționalitate.
# Rulare (din folderul proiectului):  python3 curata-texte.py      (pe Windows: python curata-texte.py)
import io
import os
import sys

CHANGES = [
    # „Cum am calculat?” — eticheta costului și descrierea ferestrei
    ("src/components/app/bits.tsx",
     '  const preset = s.costs[s.scenario] === PLAN_ASSUMPTIONS.costs[s.scenario];\n', ''),
    ("src/components/app/bits.tsx",
     '{ label: `Cost îngrijire · ${sc.label.toLowerCase()}${preset ? " (estimare demonstrativă; o poți schimba în Scenarii)" : " (valoarea ta)"}`, value: ron(c.careMonthlyCost) },',
     '{ label: `Cost îngrijire · ${sc.label.toLowerCase()}`, value: ron(c.careMonthlyCost) },'),
    ("src/components/app/bits.tsx",
     'Fiecare număr provine din valorile introduse de tine și din ipotezele demonstrative.',
     'Cum am ajuns la această sumă.'),
    # Eticheta din colțul paginilor
    ("src/components/app/bits.tsx", '{t(" Estimare demonstrativă ")}', '{t(" Estimare ")}'),
    # Nota de confidențialitate
    ("src/components/app/bits.tsx",
     ' Datele tale financiare rămân private. Acest prototip salvează informațiile doar local în browser. ',
     ' Datele tale financiare rămân private și sunt salvate doar în browserul tău. '),
    # Nota AI de după povestea de pe prima pagină
    ("src/components/app/IntakeBanner.tsx", 'Estimat de noi — poți schimba', 'Estimat de noi'),
    # Graficul costului (Scenarii)
    ("src/components/app/CostBreakdown.tsx",
     '      {isDefault && <p className="inline-block rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs font-medium">Valori demonstrative. Pune prețurile reale (oferte de la îngrijitoare, centru de zi, cămin).</p>}\n',
     ''),
    ("src/components/app/CostBreakdown.tsx", 'Revino la valorile demonstrative', 'Revino la valorile inițiale'),
    ("src/test/planning-controls.test.tsx", 'button("Revino la valorile demonstrative")', 'button("Revino la valorile inițiale")'),
    # Ipoteze (Scenarii, Cum funcționează)
    ("src/components/app/PlanningAssumptions.tsx",
     ''' Aplicarea copiază valoarea
                istorică drept bază de simulare; actualizeaz-o cu o ofertă înainte de utilizare.''',
     ''),
    ("src/components/app/PlanningAssumptions.tsx",
     '''      <p className="text-sm text-muted-foreground">
        Costurile de bază sunt demonstrative sau introduse de tine. Creștere costuri: {s.costGrowth}
        %/an; venituri: {s.incomeGrowth}%/an. Fără randamente, taxe sau subvenții publice presupuse.
        Contribuțiile familiei și economisirea lunară rămân fixe. Economiile existente nu cresc
        înainte de începerea îngrijirii. Localitatea, locuința, bunurile și independența sunt
        informații de context; nu modifică automat costurile. Venitul și economisirea personală nu
        stabilesc automat contribuția familiei: tu alegi contribuția și fondul.
      </p>
''', ''),
    # Prognoza (Sănătate, Planul meu)
    ("src/components/health/ForecastSection.tsx", '%/an din ipotezele planului.', '%/an.'),
    # Verificarea analizelor, fără analize
    ("src/components/health/LabReview.tsx",
     '<p className="mt-2 text-sm text-muted-foreground">Poți adăuga o valoare sau continua cu răspunsurile din chestionar.</p>',
     ''),
    # Cum funcționează
    ("src/routes/cum-functioneaza.tsx", 'Ipotezele demonstrative și formulele', 'Ipotezele și formulele'),
    ("src/routes/cum-functioneaza.tsx", '{t("Ipoteze demonstrative")}', '{t("Costuri de referință")}'),
    ("src/routes/cum-functioneaza.tsx",
     '''            Valori demonstrative editabile. Simulatorul include repere istorice cu surse, rate de''',
     '''            Simulatorul include repere istorice cu surse, rate de'''),
    # Invitație
    ("src/routes/invitatie.tsx",
     '{t(" va vedea răspunsul tău în planul familiei. Îl poți schimba oricând.")}',
     '{t(" va vedea răspunsul tău în planul familiei.")}'),
    # Familie și formularul de început: mesajul „Poți construi planul singur…”
    ("src/routes/familie.tsx",
     '''      {s.members.length === 0 && (
        <p className="mt-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          Poți construi planul singur sau poți adăuga ulterior alți membri ai familiei.
        </p>
      )}
''', ''),
    ("src/routes/start.tsx",
     '''                {d.members.length === 0 && (
                  <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    Poți construi planul singur sau poți adăuga ulterior alți membri ai familiei.
                  </p>
                )}
''', ''),
    ("src/routes/start.tsx",
     '''Contribuție estimată: {ron(m.contribution)}/lună. O poți modifica sau confirma
                      ulterior în planul familiei.''',
     '''Contribuție estimată: {ron(m.contribution)}/lună.'''),
    # Prima pagină
    ("src/routes/index.tsx",
     'Construim scenarii de îngrijire pe care le poți modifica.',
     'Construim scenarii de îngrijire.'),
]

if not os.path.isfile("package.json"):
    sys.exit("Rulează scriptul din folderul proiectului (acolo unde e package.json).")

done, missing = 0, []
for path, old, new in CHANGES:
    if not os.path.isfile(path):
        missing.append((path, old)); continue
    text = io.open(path, encoding="utf-8", newline="").read()
    # Funcționează și dacă fișierul are terminații de rând Windows.
    crlf = "\r\n" in text
    o, n = (old.replace("\n", "\r\n"), new.replace("\n", "\r\n")) if crlf else (old, new)
    if text.count(o) == 1:
        io.open(path, "w", encoding="utf-8", newline="").write(text.replace(o, n))
        done += 1
    elif text.count(o) == 0 and (not n.strip() or n.strip() in text):
        done += 1  # deja aplicat la o rulare anterioară
    else:
        missing.append((path, old))

print(f"OK: {done} din {len(CHANGES)} texte curățate.")
if missing:
    print("Nu le-am găsit pe acestea (poate au fost deja șterse sau schimbate de Lovable):")
    for path, old in missing:
        print(f"  - {path}: {old.strip().splitlines()[0][:90]}")
