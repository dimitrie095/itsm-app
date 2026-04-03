# Automation-Seite Testfälle & Funktionalitäten

Dieses Dokument enthält eine umfassende Liste aller testbaren Funktionalitäten der Automation-Seite. Die Testfälle sind nach Priorität und Kategorie sortiert.

## 🔴 Hohe Priorität (Kernfunktionalität)

### 1.1 Login & Navigation
- [ ] **Login und Sidebar-Navigation**
  - Als Admin einloggen
  - Über Sidebar auf Automation navigieren
  - Verifizierung, dass Automation-Seite geladen wird
  - URL-Check: `/automation`
  - Verifizierung, dass Statistik-Karten sichtbar sind

- [ ] **Agent-Login & Permissions**
  - Als Agent einloggen
  - Prüfen, ob Automation-Link in Sidebar sichtbar ist
  - Bei Zugriff: Navigation zur Automation-Seite
  - Bei keinem Zugriff: Unauthorized-Page oder Link nicht sichtbar

### 1.2 Seiten-Load & Basiselemente
- [ ] **Alle Statistik-Kards sind sichtbar**
  - Total Rules Card
  - Active Rules Card
  - Execution Rate Card
  - Last Execution Card
  - Werte sind korrekt formatiert (z.B. "85%" bei Execution Rate)

- [ ] **Basiselemente sind vorhanden**
  - "Create Rule" Button ist sichtbar und klickbar
  - "Monitor" Link ist sichtbar und klickbar
  - Search-Input ist sichtbar und hat Placeholder-Text
  - Filter-Buttons für Kategorie und Status sind vorhanden

### 1.3 Rule-Table Grundfunktionalität
- [ ] **Rule-Table wird angezeigt**
  - Table-Header sind korrekt (Rule Name, Trigger, Actions, Status, Last Executed)
  - Wenn keine Rules: "No rules found" oder ähnliche Nachricht
  - Wenn Rules vorhanden: Zeilen werden mit Rule-Daten angezeigt
  - Minimum: 1 Rule in der Tabelle anzeigen

## 🟠 Mittlere Priorität (Rule Management)

### 2.1 Suche & Filter
- [ ] **Suche nach Rule-Namen**
  - Text in Search-Input eingeben
  - Wartezeit für Debounce (500ms)
  - Nur Rules mit passendem Namen werden angezeigt
  - "Clear All" Filter-Button leert die Suche

- [ ] **Filter nach Kategorie**
  - Kategorie-Dropdown öffnen
  - Eine Kategorie auswählen (z.B. "Tickets", "Assets")
  - Nur Rules dieser Kategorie werden angezeigt
  - Anzahl der angezeigten Rules reduziert sich korrekt

- [ ] **Filter nach Status**
  - Status-Filter "Active Only" auswählen
  - Nur aktive Rules werden angezeigt
  - Status-Filter "Inactive Only" auswählen
  - Nur inaktive Rules werden angezeigt

- [ ] **Kombinierte Suche & Filter**
  - Suche + Kategorie-Filter kombinieren
  - Beide Filter funktionieren gleichzeitig korrekt
  - "Clear All" setzt beide Filter zurück

### 2.2 Rule-Aktionen (Context Menu)
- [ ] **Rule-Context-Menü öffnen**
  - Hover über Rule-Zeile
  - Click auf "More" oder "Actions" Button
  - Menü mit Optionen wird angezeigt

- [ ] **Rule bearbeiten**
  - Action "Edit Rule" auswählen
  - Navigation zur Edit-Page: `/automation/[id]/edit`
  - Formular wird mit bestehenden Daten geladen

- [ ] **Rule duplizieren**
  - Action "Duplicate" auswählen
  - Neue Rule mit "(Copy)" im Namen wird erstellt
  - Success-Toast wird angezeigt
  - Neue Rule erscheint in der Tabelle

- [ ] **Rule aktivieren/deaktivieren**
  - Toggle-Status-Action auswählen
  - Status ändert sich von Active → Inactive oder umgekehrt
  - Stats-Cards aktualisieren sich (Active Rules Count)

- [ ] **Rule löschen**
  - Action "Delete Rule" auswählen
  - Bestätigungs-Dialog erscheint
  - Nach Bestätigung: Rule wird gelöscht
  - Tabelle aktualisiert sich

### 2.3 Tabs (All Rules, Active, Inactive, Recent)
- [ ] **"All Rules" Tab**
  - Standardmäßig aktiv
  - Alle Rules (Active + Inactive) werden angezeigt

- [ ] **"Active" Tab**
  - Nur aktive Rules werden angezeigt
  - Anzahl stimmt mit "Active Rules" Statistik-Kard überein

- [ ] **"Inactive" Tab**
  - Nur inaktive Rules werden angezeigt
  - Keine aktiven Rules in der Liste

- [ ] **"Recent Executions" Tab**
  - Zeigt kürzlich ausgeführte Rules
  - Enthält Timestamp, Status (Success/Failed), Execution Details

## 🟡 Niedrige Priorität (Erweiterte Features)

### 3.1 Neue Rule erstellen
- [ ] **Create-Rule-Form öffnen**
  - Click auf "Create Rule" Button
  - Navigation zu `/automation/new`
  - Formular mit allen Feldern wird angezeigt

- [ ] **Form-Felder ausfüllen**
  - Rule Name eingeben
  - Beschreibung eingeben
  - Trigger auswählen (z.B. "Ticket Created", "Asset Updated")
  - Bedingungen hinzufügen
  - Actions hinzufügen

- [ ] **Rule speichern**
  - Submit-Formular
  - Success-Toast wird angezeigt
  - Navigation zurück zu `/automation`
  - Neue Rule erscheint in der Tabelle

- [ ] **Form-Validierung**
  - Pflichtfelder (Rule Name, Trigger) sind erforderlich
  - Leeres Formular zeigt Errors
  - Ungültige Eingaben werden abgefangen

### 3.2 Rule bearbeiten & aktualisieren
- [ ] **Edit-Form öffnen**
  - Von Tabelle auf Rule klicken
  - Formular mit bestehenden Daten geladen

- [ ] **Änderungen speichern**
  - Name oder Beschreibung ändern
  - Changes werden gespeichert
  - Zurück zur Automation-Page
  - Tabelle zeigt aktualisierte Daten

- [ ] **Änderungen verwerfen**
  - Cancel-Button klicken
  - Navigation zurück ohne Speichern
  - Keine Änderungen in der Tabelle

### 3.3 Monitoring-Seite
- [ ] **Monitor-Page öffnen**
  - Click auf "Monitor" Button
  - Navigation zu `/automation/monitor`
  - Execution-Log wird angezeigt

- [ ] **Execution-Log anzeigen**
  - Liste mit Rule-Executions
  - Jeder Eintrag zeigt: Rule Name, Timestamp, Status, Execution Time
  - Filter nach Datum oder Status möglich

- [ ] **Execution-Details anzeigen**
  - Auf Execution-Eintrag klicken
  - Modal mit Details (Input, Output, Logs)

- [ ] **Manuelle Execution starten**
  - "Test Rule" Action auswählen
  - Rule wird sofort ausgeführt
  - Execution erscheint im Log

### 3.4 Rule-Kategorien & Tags
- [ ] **Kategorien anzeigen**
  - Rules haben Kategorie-Badges (z.B. "Tickets", "Assets")
  - Badges sind farblich kodiert

- [ ] **Kategorien im Formular**
  - Beim Erstellen/Bearbeiten kann Kategorie gewählt werden
  - Dropdown mit allen verfügbaren Kategorien

## 🔒 Berechtigungen & Rollen (Wichtig für die Sicherheit)

### 4.1 Admin-Berechtigungen
- [ ] **Admin kann alles**
  - Alle Rules sehen
  - Rules erstellen, bearbeiten, löschen
  - Monitoring-Seite sehen
  - Alle Stats sehen

### 4.2 Agent-Berechtigungen
- [ ] **Agent eingeschränkter Zugriff**
  - Nur bestimmte Rules sehen (z.B. keine Admin-Rules)
  - Kann Rules bearbeiten, aber nicht löschen
  - Kein Zugriff auf bestimmte Kategorien

### 4.3 End-User-Berechtigungen
- [ ] **End-User kein Zugriff**
  - Automation-Link nicht in Sidebar sichtbar
  - Direkter Zugriff auf `/automation` führt zu "Unauthorized"

### 4.4 Custom Rollen
- [ ] **Custom Rollen & Permissions**
  - Nur "automation.view" Permission: Seite sehen, aber keine Änderungen
  - Nur "automation.create" Permission: Nur neue Rules erstellen
  - Kombinierte Permissions funktionieren korrekt

## ⚡ Performance & Edge Cases

### 5.1 Performance Tests
- [ ] **Große Anzahl an Rules**
  - 100+ Rules in der Tabelle
  - Seite lädt schnell (< 2 Sekunden)
  - Suche & Filter bleiben performant

- [ ] **Viele Executions im Monitor**
  - 1000+ Execution-Logs
  - Pagination funktioniert
  - Infinite Scroll lädt mehr Daten nach

### 5.2 Error Handling
- [ ] **API-Fehler behandeln**
  - Netzwerkfehler zeigen Error-Toast
  - 404 Not Found: Redirect zu 404-Seite
  - 500 Server Error: Zeigt Error-Boundary

- [ ] **Leere Zustände**
  - Keine Rules: Zeigt "No rules created yet" mit CTA
  - No Search Results: Zeigt "No rules match your search"
  - No Executions: Zeigt "No executions yet"

### 5.3 Responsive Design
- [ ] **Mobile Ansicht**
  - Sidebar wird zu Drawer/Menu
  - Tabelle ist scrollable
  - Buttons bleiben klickbar
  - Formulare sind responsive

### 5.4 Cross-Browser-Kompatibilität
- [ ] **Chrome, Firefox, Safari**
  - Alle Features funktionieren in allen Browsern
  - CSS wird korrekt gerendert

## 📊 Statistik & Datenintegrität

### 6.1 Statistik-Kards Genauigkeit
- [ ] **Total Rules zählt korrekt**
  - Anzahl stimmt mit tatsächlicher Rule-Anzahl überein
  - Nach Create/Delete aktualisiert sich die Zahl

- [ ] **Active Rules zählt korrekt**
  - Nur Rules mit Status "Active" werden gezählt
  - Nach Status-Change aktualisiert sich die Zahl

- [ ] **Execution Rate berechnet korrekt**
  - Prozentwert basiert auf erfolgreichen vs. fehlgeschlagenen Executions
  - Rate aktualisiert sich nach neuen Executions

- [ ] **Last Execution Timestamp**
  - Zeitstempel der letzten Execution wird angezeigt
  - Format: "2 minutes ago", "1 hour ago", etc.
  - Aktualisiert sich nach neuer Execution

### 6.2 Datenkonsistenz
- [ ] **Rule-Details stimmen überall überein**
  - Name in Table = Name in Edit-Form
  - Status in Table = Status in Details
  - Ausführungshistorie ist konsistent

## 🎯 Test-Implementation Status

| Kategorie | Tests Geplant | Tests Implementiert | Test-Coverage |
|-----------|---------------|---------------------|---------------|
| Login & Navigation | 4 | 2 | 50% |
| Basis-UI | 4 | 1 | 25% |
| Suche & Filter | 6 | 0 | 0% |
| Rule-Management | 12 | 3 | 25% |
| Monitoring | 5 | 0 | 0% |
| Berechtigungen | 8 | 4 | 50% |
| Performance | 3 | 0 | 0% |
| Edge Cases | 6 | 1 | 16% |
| **Gesamt** | **48** | **11** | **23%** |

## 📝 Empfohlene Implementierungs-Reihenfolge

1. **Phase 1: Grundlagen** (Schon teilweise implementiert)
   - Login & Navigation
   - Basis-UI Elemente
   - Statistik-Kards

2. **Phase 2: Rule-Management**
   - Suche & Filter
   - Rule-Aktionen (Edit, Delete, Duplicate)
   - Status-Toggle

3. **Phase 3: Erweiterte Features**
   - Create/Edit Forms
   - Monitoring-Seite
   - Test-Execution

4. **Phase 4: Berechtigungen**
   - Agent-Permission-Tests
   - End-User-Access-Denied
   - Custom Role-Tests

5. **Phase 5: Performance & Edge Cases**
   - Große Datenmengen
   - Error Handling
   - Responsiveness

## 🚀 Nächste Schritte

Um die Testabdeckung zu erhöhen, empfehle ich:

1. **Fokus auf Suche & Filter** (hoher ROI, mittlerer Aufwand)
2. **Rule-Aktionen** (Edit, Duplicate, Delete) implementieren
3. **Monitoring-Tests** hinzufügen
4. **Performance-Benchmarks** erstellen
5. **Visual Regression Tests** für UI-Stabilität

---

**Dokument version:** 1.0  
**Letzte Aktualisierung:** 2024  
**Autor:** Playwright Test Team