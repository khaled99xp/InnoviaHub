## Implementation – Integrering av Innovia Hub IoT (Projektinlämning 2)

Detta dokument är en teknisk genomförandebeskrivning (implementation guide) för integreringen. Det innehåller datamodell, API-kontrakt (med exempel), sekvensflöden mellan tjänster, konfigurationsnycklar per tjänst, körningsinstruktioner, testfall/acceptanskriterier samt en kravmatris som spårar varje krav till implementerade artefakter.

---

### 1) Systemöversikt och komponenter

- DeviceRegistry.Api (HTTP, PostgreSQL): tenant- och enhetshantering.
- Ingest.Gateway (HTTP/MQTT, DB): tar emot mätvärden och persistenter dem.
- Realtime.Hub (SignalR): pushar senaste mätvärden/alerts till klienter i realtid.
- Portal.Adapter (HTTP): förenklad läsning av data till externa portar.
- Rules.Engine (Worker): utvärderar regler, genererar alerts.
- Edge.Simulator (Console, MQTT): simulerar enheter baserat på DeviceRegistry.
- Frontend (React/TS, SignalR): visar enheter, mätvärden, regler och alerts.

Kommunikation i korthet:

- UI listar enheter från DeviceRegistry.Api och kopplar upp mot Realtime.Hub.
- Edge.Simulator publicerar mätvärden till Ingest via MQTT (Mosquitto). Realtime.Hub pushar vidare.
- Rules.Engine lyssnar på mätvärden, utvärderar regler och publicerar alerts.

---

### 2) Datamodell (DeviceRegistry)

Tenant

- Id (Guid)
- Name (string)
- Slug (string, unikt per tenant)

Device

- Id (Guid)
- TenantId (Guid, FK Tenant)
- RoomId (Guid?, reserverad)
- Serial (string, unikt per Tenant)
- Model (string, beskrivande modellnamn)
- Status (string: "active" | "inactive")

Persistens konfigureras i `appsettings.json` (PostgreSQL). Tabellen skapas via `EnsureCreated()` vid start i utvecklingsläge.

---

### 3) API-kontrakt (DeviceRegistry.Api)

Bas-URL: `http://localhost:5101`

Hämta tenant via slug

- GET `/api/tenants/by-slug/{slug}`
  Exempel svar:

```json
{
  "id": "8b1a0c7b-...",
  "name": "Innovia",
  "slug": "innovia"
}
```

Lista enheter för tenant

- GET `/api/tenants/{tenantId}/devices`
  Exempel svar:

```json
[
  {
    "id": "...",
    "tenantId": "...",
    "serial": "dev-101",
    "model": "Acme Temperature Sensor",
    "status": "active"
  }
]
```

Skapa enhet

- POST `/api/tenants/{tenantId}/devices`
  Body:

```json
{ "serial": "dev-201", "model": "Acme CO₂ Monitor", "status": "active" }
```

Uppdatera enhet

- PUT `/api/tenants/{tenantId}/devices/{deviceId}`
  Body:

```json
{ "serial": "dev-101", "model": "Acme Temperature Pro", "status": "inactive" }
```

Ta bort enhet

- DELETE `/api/tenants/{tenantId}/devices/{deviceId}`

Hämta enhet via serienummer

- GET `/api/tenants/{tenantId}/devices/by-serial/{serial}`

---

### 4) Edge.Simulator – integrationsdetaljer

Källkod: `innovia-iot/src/Edge.Simulator/Program.cs`

Flöde:

1. Hämta tenant via `GET /api/tenants/by-slug/innovia`.
2. Hämta enheter via `GET /api/tenants/{tenantId}/devices`.
3. Filtrera `Status == "active"`.
4. Härled sensortyp och värdeintervall utifrån `Model` (t.ex. Temperature/CO₂/Humidity/Door/Power).
5. Publicera mätvärden via MQTT (Mosquitto) med ~10s intervall.

Observera: inga hårdkodade enheter. Simulatorn speglar alltid DeviceRegistry.

---

### 5) Frontend – centrala delar

- `pages/Admin/IoTDashboard.tsx`:
  - Flikar: Dashboard / Device Management
  - Korten visar enhetens samtliga sensorer/mätningar och status.
  - Statuslogik: Aktiv i DB + färska mätvärden => Online.
- `components/Admin/IoT/DeviceManagement.tsx`:
  - CRUD: skapa, uppdatera, aktivera/inaktivera, radera.
  - Modellnamn standardiseras via `getDeviceModel`-mappning.
- `pages/Admin/RulesManagement.tsx`:
  - Flikar: Rules / Alerts, pagination och filter.
  - Door-tröskel = dropdown (Closed/Open). Power/PowerOff-ikoner.
  - Auto-refresh av alerts och korrekt enhetsnamn.

---

### 6) Körning och konfiguration

Förutsättningar

- PostgreSQL, Mosquitto (MQTT), ev. Redis.
- .NET 8 SDK, Node 18+.

Starta tjänster

1. DeviceRegistry.Api
   - (valfritt) Seed vid första körning:
     - `DEVICE_REGISTRY_SEED=true`
     - `SEED_TENANT_SLUG=innovia`
     - `SEED_TENANT_NAME=Innovia`
   - `dotnet run` → `http://localhost:5101/swagger`
2. Edge.Simulator
   - Kör Mosquitto på `localhost:1883`.
   - `dotnet run` (hämtar enheter dynamiskt och publicerar mätvärden).
3. Frontend
   - `npm install && npm run dev` → `http://localhost:5173`.

Konfigurationsnycklar (exempel)

- DeviceRegistry.Api: `ConnectionStrings__Db`
- Edge.Simulator: URL till DeviceRegistry (`http://localhost:5101`) och MQTT-broker (`localhost:1883`).

---

### 7) Sekvensflöden

Skapa enhet via UI → synlig i simulator

1. Admin skapar enhet i Device Management (UI).
2. UI anropar DeviceRegistry.Api (POST devices).
3. Edge.Simulator (nästa loop) hämtar listan och börjar publicera mätningar för den nya enheten om status = active.
4. Frontend visar senaste mätvärde via Realtime.Hub.

Alert-flöde (översikt)

1. Rules.Engine lagrar regel (ex.: "temp > 28°C").
2. Nya mätvärden från Edge.Simulator tas emot av Ingest.
3. Rules.Engine utvärderar och publicerar alert.
4. Frontend lyssnar och visar alert under Alerts-fliken.

---

### 8) Testfall och acceptanskriterier

TC-01 Registrera 10 enheter (seed)

- Givet seed aktiverad → När DeviceRegistry startar → Då skapas tenant `innovia` och 10 enheter (`dev-101` … `dev-110`).
- Verifiera via `GET /api/tenants/by-slug/innovia` följt av `GET /api/tenants/{tenantId}/devices`.

TC-02 Skapa enhet via UI

- När en ny enhet registreras från Device Management med unikt `serial` → Då ska den visas i listan samt i Edge.Simulator vid nästa polling, och UI ska visa mätvärden i realtid.

TC-03 Aktivera/Inaktivera enhet

- När status ändras till `inactive` → Simulatorn ska sluta publicera för den enheten.

TC-04 Door-tröskel i RulesManagement

- När en Door-enhet väljs → Tröskelkontrollen ska vara en dropdown (Closed/Open) och POST:en ska skicka korrekt värde.

TC-05 Alerts auto-refresh

- När tröskel överskrids → Alert syns under "Alerts" utan manuell refresh inom pollingintervallet.

---

### 9) Kravmatris (traceability)

- Minst 10 enheter i DeviceRegistry: Seed i DeviceRegistry.Api (dev-101..dev-110), UI-stöd för fler.
- Alla enheter får mock-data: Edge.Simulator publicerar baserat på Model och Status.
- Hämtas via DeviceRegistry och visas i portal: IoTDashboard listar enheter och status.
- Realtidsdata via SignalR/Realtime.Hub: UI visar senaste mätvärden i korten.
- Prototyp av Rules/Alerts: RulesManagement-UI, Rules.Engine delete-endpoints, alerts-visning och auto-refresh.

---

### 10) Kända begränsningar

- Enkel models-to-sensor-heuristik i simulatorn; kan behöva utökas för fler modeller.
- Door/Power mappning är baserad på modellnamnskonventioner.
- Seed är endast för utveckling och ska inte användas i produktion.

---

### 11) Exempelpayloads

Skapa enhet (POST)

```json
{ "serial": "dev-201", "model": "Acme Energy Meter", "status": "active" }
```

Uppdatera enhet (PUT)

```json
{ "serial": "dev-101", "model": "Acme Temperature Pro", "status": "inactive" }
```

Lista enheter (GET)

```json
[
  {
    "serial": "dev-101",
    "model": "Acme Temperature Sensor",
    "status": "active"
  }
]
```

---
