# Sudoku en puzzelpret: instructies voor Claude

Lees eerst `OVERDRACHT.md`: daarin staat hoe het project in elkaar zit, wat er besloten is en hoe je de online versies (artifacts) bijwerkt.

## Regiebord
De taken van dit project staan op het Regiebord: artifact 7a8b16fb-88d5-4045-aba7-9eca10a3b37f, project-id "sudoku".
Gebruik de tools db_query, db_get en db_write van claude-artifacts met deze slug.

Begin van een sessie
- Lees alleen dit project: db_query op collectie "tasks" met where project == "sudoku". Sla kaarten met status "done" over. Lees niet het hele bord.
- Kaarten met waitingOn "claude" hebben een antwoord van Bastiaan in "thread": verwerk dat eerst.

Tijdens de sessie
- Kijk niet steeds op het bord. Werk het pas aan het eind bij, liefst in één db_write.

Einde van een sessie
- Zet de status van elke kaart waaraan je werkte: todo, doing, review of done.
- Iets nodig van Bastiaan (testen, kiezen, aanleveren)? Status "review", waitingOn "jij" en de vraag als bericht in thread: {from: "claude", text, at}.
- Schrijf een overdracht van hooguit 3 regels in projects/sudoku: velden handoff (gedaan / open / volgende stap), handoffAt (ISO-tijd) en sessionUrl.
- Nieuwe taak: nieuw document in "tasks" met project "sudoku", title, detail, owner (lead, opus, sonnet, haiku of jij), priority (hoog, normaal, laag), status, milestone (optioneel), order en updatedAt.
- Zet updatedAt (ISO-tijd) bij elke wijziging.
