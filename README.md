# Om

Detta projekt är ett avancerat bokningssystem för ett coworkingcenter med AI-integration. Användare kan boka skrivbord, mötesrum, VR-utrustning och AI-servrar med realtidsuppdatering och intelligenta rekommendationer.

# Teknisk information

## Ramverk och bibliotek

- React
- Tailwind CSS
- ASP.NET Core Web API
- MySQL
- SignalR för realtidsuppdatering
- OpenAI GPT-3.5-turbo för AI-funktionalitet
- JWT-autentisering

## Nya funktioner (AI-integration)

- **AI Chat**: Intelligenta rekommendationer för bokningar med kontextuell förståelse
- **Smart Booking Helper**: AI-assistent som hjälper användare att välja rätt resurs
- **AI Insights**: Avancerad analys av bokningsmönster för administratörer
- **Intelligent Resource Recommendations**: AI-förslag baserat på användarens behov
- **Context-Aware AI**: AI som förstår plattformens syfte och filtrerar irrelevanta frågor
- **Dynamic Prompt Management**: Konfigurerbara AI-prompts utan omstart av applikationen

## Annat

- Frontend körs på [http://localhost:5173](http://localhost:5173)
- Backend körs på [http://localhost:5296](http://localhost:5296)
- Använder RESTful API
- Använder JWT-token för autentisering
- SignalR för realtidsuppdatering av bokningar
- OpenAI API för AI-funktionalitet

# Appbyggande

## Nödvändiga installationer

- .NET 8 eller 9
- Node.js & npm
- MySQL
- OpenAI API-nyckel (för AI-funktionalitet)

## Databas

- Skapa en SQL connection på localhost:3306.
- Gå in på "appsettings.json" i backend-mappen.
- I strängen "DefaultConnection", ändra "User" till din connections användarnamn och "Password" till din connections lösenord.
- Sätt en secretkey till minst 32 tecken.

## AI-konfiguration

- Lägg till din OpenAI API-nyckel i "appsettings.json" under "OpenAI.ApiKey"
- AI-funktionalitet är valfri - systemet fungerar även utan OpenAI-nyckel
- **AI Prompts**: Konfigurera AI-beteende genom att redigera `backend/Config/AIPrompts.json`
- **Smart Filtering**: AI filtrerar automatiskt irrelevanta frågor och fokuserar på bokningsrelaterade ämnen

## Starta applikationen

```
cd backend
dotnet restore
dotnet ef database update
dotnet run
```

```
cd frontend
npm install
npm run dev
```

## Användare

För att boka måste du logga in. <br />
Du kan skapa en ny användare eller med hjälp av standarduppgifterna. <br />
Admins kan använda admin tools genom att gå in på [http://localhost:5173/admin](http://localhost:5173/admin) <br />

**Admin konto:** <br />
**E-post: admin@innoviahub.com**, <br />
**Lösenord: Admin123!**

**Members konto:** <br />
**E-post: member@innoviahub.com**, <br />
**Lösenord: Member123!**

## AI-funktioner

- **AI Chat**: [http://localhost:5173/ai-chat](http://localhost:5173/ai-chat) - Chat med AI för bokningshjälp
- **AI Insights**: [http://localhost:5173/admin/ai-insights](http://localhost:5173/admin/ai-insights) - AI-analys för administratörer
- **Smart Booking**: AI-rekommendationer när du skapar bokningar
- **Context-Aware Responses**: AI förstår plattformens syfte och svarar endast på bokningsrelaterade frågor
- **Dynamic Prompt Configuration**: Anpassa AI-beteende genom konfigurationsfiler

# Endpoints

<details>

<summary> Authentication endpoints </summary>

**GET**
**/api/auth/health**

Returnerar statuskod 400 om API:et fungerar.

**POST**
**/api/auth/register** <br />
Body: <br />
string Email, <br />
string FirstName, <br />
string LastName, <br />
string Password, <br />
string ConfirmPassword

Skapar en ny användare med rollen "Member".

**POST**
**/api/auth/login** <br />
Body: <br />
string Email, <br />
string Password

Loggar in användare och returnerar JWT-token.

**POST**
**api/auth/logout**

Loggar ut användare.

**GET**
**api/auth/profile** <br />
Autentisering: Member

Returnerar hela objektet av användaren som loggar in.

**PUT**
**/api/auth/profile** <br />
Autentisering: Member <br />
Body: <br />
string FirstName <br />
string LastName

Ändrar FirstName och LastName av användaren som loggar in.

**POST**
**/api/auth/refresh-token** <br />
Autentisering: Member <br />
Body: <br />
string Token

Uppdaterar och returnerar token.

</details>

<details>

<summary> Booking endpoints </summary>

**GET**
**/api/bookings/** <br />
Autentisering: Admin, Member <br />

Returnerar alla bokningar.

**GET**
**/api/bookings/{bookingId}** <br />
Autentisering: Admin, Member

Returnerar bokning som motsvarar id.

**GET**
**/api/bookings/myBookings** <br />
Autentisering: Admin, Member <br />
Body: <br />
bool includeExpiredBookings (default är false)

Returnerar alla aktiva bokningar som tillhör användaren. Måste specificera om man vill inkludera inaktiva bokningar.

**GET**
**/api/bookings/getByResource/{resourceId}** <br />
Autentisering: Admin, Member <br />
Body: <br />
bool includeExpiredBookings (default är false)

Returnerar alla aktiva bokningar som tillhör en resurs. Måste specificera om man vill inkludera inaktiva bokningar.

**POST**
**/api/bookings** <br />
Autentisering: Admin, Member <br />
Body: <br />
int ResourceId <br />
DateTime BookingTime <br />
string Timeslot (måste vara "FM" eller "EF")

Skapar en bokning. Tiden på "BookingTime" ersätts av "8:00" eller "12:00" beroende på timeslot.

**PUT**
**/api/bookings** <br />
Autentisering: Admin <br />
Body: <br />
int BookingId, <br />
bool IsActive, <br />
DateTime BookingDate, <br />
DateTime EndDate, <br />
string UserId, <br />
int ResourceId

Uppdaterar bokning.

**POST**
**/api/bookings/cancel/{bookingId}** <br />
Autentisering: Admin, Member <br />

Tar bort bokning som motsvarar "bookingId". <br />
Members kan bara ta bort sina egna bokningar och Admins kan ta bort vilken bokning som helst. <br />
Bokningar som har gått ut kan inte tas bort.

**POST**
**/api/bookings/delete/{bookingId}** <br />
Autentisering: Admin

Tar bort bokning.

</details>

<details>

<summary> Resource endpoints </summary>

**GET**
**/api/bookings/resources** <br />
Autentisering: Admin, Member

Returnerar alla resurser.

**GET**
**api/resources/{resourceId}** <br />
Autentisering: Admin, Member

Returnerar resurs som motsvarar id.

**POST**
**api/resources** <br />
Autentisering: Admin <br />
Body: <br />
int ResourceTypeId (1 = DropInDesk, 2 = MeetingRoom, 3 = VRset, 4 = AIserver), <br />
string Name

Skapar en ny resurs.

**PUT**
**api/resources/{resourceId}** <br />
Autentisering: Admin <br />
Body: <br />
int ResourceTypeId (1 = DropInDesk, 2 = MeetingRoom, 3 = VRset, 4 = AIserver), <br />
string Name, <br />
bool IsBooked

Uppdaterar resursen som motsvarar id.

**DELETE**
**api/resources/{resourceId}** <br />
Autentisering: Admin

Tar bort resurs.

</details>

<details>

<summary> AI endpoints </summary>

**POST**
**/api/ai/chat** <br />
Autentisering: Member <br />
Body: <br />
string Message, <br />
string SessionId (valfritt)

Skickar meddelande till AI-chatten och får intelligenta svar om bokningar. AI filtrerar automatiskt irrelevanta frågor och fokuserar på bokningsrelaterade ämnen.

**GET**
**/api/ai/insights** <br />
Autentisering: Admin

Returnerar AI-genererade insikter om bokningsmönster och rekommendationer.

**POST**
**/api/ai/recommendations** <br />
Autentisering: Member <br />
Body: <br />
string UserPreferences

Får AI-rekommendationer för resurser baserat på användarens preferenser.

**GET**
**/api/ai/chat-history** <br />
Autentisering: Member

Returnerar användarens AI-chatthistorik.

</details>

<details>

<summary> Payment endpoints </summary>

**POST**
**/api/payment/process** <br />
Autentisering: Member <br />
Body: <br />
int BookingId, <br />
decimal Amount, <br />
string PaymentMethod

Processar betalning för en bokning.

**GET**
**/api/payment/history** <br />
Autentisering: Member

Returnerar användarens betalningshistorik.

</details>

# Avancerade funktioner

## Realtidsuppdatering

- **SignalR Integration**: Automatiska uppdateringar när bokningar skapas, ändras eller avbryts
- **Live Status**: Se bokningsstatus i realtid utan att behöva uppdatera sidan
- **Push Notifications**: Få notifieringar om bokningsändringar

## AI-drivna funktioner

- **Intelligent Booking Assistant**: AI som hjälper användare att välja rätt resurs
- **Smart Recommendations**: Personliga förslag baserat på användarens historik
- **Predictive Analytics**: AI-analys av bokningsmönster för bättre planering
- **Natural Language Processing**: Chat med AI på naturligt språk
- **Context-Aware Filtering**: AI förstår plattformens syfte och filtrerar irrelevanta frågor
- **Dynamic Prompt Management**: Konfigurerbara AI-prompts för anpassade beteenden
- **Smart Response System**: AI svarar endast på bokningsrelaterade frågor med relevanta förslag

## Administrativa verktyg

- **AI Insights Dashboard**: Avancerad analys av systemets prestanda
- **User Analytics**: Djupgående användarstatistik
- **Resource Optimization**: AI-förslag för resursförbättringar
- **Automated Reports**: Automatiska rapporter med AI-insikter

## AI Prompt Management

### Konfigurera AI-beteende

AI-systemet använder konfigurerbara prompts för att säkerställa relevanta svar. Redigera `backend/Config/AIPrompts.json` för att anpassa AI-beteendet:

```json
{
  "SystemPrompt": "Du är en AI-assistent för InnoviaHub...",
  "NonPlatformResponse": "Jag beklagar, jag är en assistent specialiserad...",
  "PlatformKeywords": ["boka", "resurs", "mötesrum", "skrivbord"],
  "NonPlatformKeywords": ["hungrig", "mat", "väder", "sport"]
}
```

### Funktioner

- **Smart Filtering**: AI filtrerar automatiskt irrelevanta frågor
- **Context Awareness**: Förstår plattformens syfte och fokuserar på bokningar
- **Dynamic Configuration**: Ändra AI-beteende utan omstart av applikationen
- **Keyword Management**: Konfigurera vilka ord som ska filtreras eller tillåtas

## Säkerhet och prestanda

- **JWT Authentication**: Säker autentisering med token-baserad säkerhet
- **Role-based Access Control**: Olika behörigheter för användare och administratörer
- **Database Optimization**: Optimerad databasstruktur för snabba svar
- **Error Handling**: Robust felhantering med detaljerade felmeddelanden
- **AI Security**: Säker AI-integration med konfigurerbara säkerhetsinställningar
