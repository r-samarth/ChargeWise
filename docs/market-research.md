# Karnataka EV Charging Market Research — ChargeWise

**Research Date:** 2026-11-25  
**Scope:** Karnataka, India (Primary Demonstration Corridor: Mysuru → Mangaluru)  
**Confidence Policy:** Every fact below distinguishes verified operator disclosures and official government portals from field-level estimates or unknowns. Live availability and station-specific tariffs are never assumed unless confirmed by an authorized feed.

---

## 1. Karnataka EV Ecosystem Overview

Karnataka is one of India's strongest electric-mobility states, anchored by Bengaluru's 2-wheeler/4-wheeler adoption and inter-city tourism/commercial corridors connecting Bengaluru, Mysuru, Kodagu (Madikeri/Kushalnagar), Dakshina Kannada (Mangaluru/Puttur), Hassan, Udupi, Hubballi-Dharwad, and Belagavi.

### Verified Macro Indicators
- **State EV Registrations (VAHAN):** Karnataka recorded **1,77,646** EV registrations in calendar year 2024 and **1,69,704** EV registrations up to late November 2025, bringing the cumulative EV fleet near **8.9 lakh** vehicles by late 2025/2026.
- **District Concentration:** Bengaluru Urban accounts for roughly **50%–60%** of Karnataka's new EV registrations (**1,00,150** in 2024; **91,693** Jan–Nov 2025), while Tier-2 cities such as Mysuru and Mangaluru form secondary adoption clusters.
- **Charging Infrastructure Footprint:** National registries (BEE EV Yatra / MHI disclosures) list **6,000+** public/semi-public charging stations in Karnataka (up sharply from 1,041 in earlier 2023–2024 BEE snapshots), with **BESCOM** designated as the State Nodal Agency.
- **Regulated Public EV Tariff Baseline (KERC LT-6(c)):** Karnataka Electricity Regulatory Commission sets the promotional baseline energy charge for public EV charging stations at **₹4.50/kWh** (valid under the multi-year tariff period through March 2028, up to 150 kW LT sanctioned load), excluding applicable fixed charges, FPPCA, taxes, and CPO service/margin fees passed to drivers.

---

## 2. Operator Ecosystem Analysis (13+ Operators)

| Operator | Coverage in Karnataka | Primary Connector Standards | Typical Power Ratings | Payment & Reservation | Live Status / Public API & OCPI | Official App / Web / Support (Verified) |
|---|---|---|---|---|---|---|
| **Tata Power EZ Charge** | Strongest highway & dealer corridor coverage (Bengaluru, Mysuru, Hunsur/Bannikuppe, Hassan, Sakleshpur, Madikeri, Mangaluru, Hubballi, Belagavi) | CCS2, CHAdeMO, Type 2 AC, Bharat AC-001 / DC-001 | 3.3–22 kW AC; 25 kW, 30 kW, 60 kW DC (some 120 kW hubs) | App wallet, UPI, Cards, RFID; slot booking on select chargers in app | Live status inside proprietary app; no open public unauthenticated API; OCPI roaming limited to closed B2B partnerships | Web: `tatapower.com` · Android: `com.tatapower.ezcharge` · iOS: `id1539201997` · Phone: `1800 833 2233` · Email: `evsupport@tatapower.com` |
| **Zeon Charging** | Strong South India highway & resort/mall network (Mysuru, Kushalnagar, Madikeri, Puttur, Mangaluru, Hassan, Hubballi) | CCS2, Type 2 AC | 7.4–22 kW AC; 30 kW, 50 kW, 60 kW, 90 kW, 120 kW DC | Zeon App wallet, UPI, Cards, AutoCharge on select units | Live status inside Zeon App; no public unauthenticated API | Web: `zeoncharging.com` · Android: `com.zeon.charging` · iOS: `id1506169992` · Phone: `+91 97896 16161` · Email: `care@zeoncharging.com` |
| **Statiq** | Dense urban & highway partner stations across Bengaluru, Mysuru, Hassan, Channarayapatna, Mangaluru, Belagavi | CCS2, Type 2 AC, Bharat AC/DC | 3.3–22 kW AC; 30–60 kW+ DC | Statiq Wallet, UPI, Cards; app-based booking on select sites | Live status in Statiq App; runs EVLinq OCPI roaming platform for B2B partners; no open unauthenticated public API | Web: `statiq.in` · Android: `com.statiq.statiq_app` · iOS: `id1527878895` · Phone: `+91 80707 43743` · Email: `support@statiq.in` |
| **ChargeZone** | Major highway express corridors (NH 44, NH 48, Bengaluru–Mysuru, Hubballi) & fleet hubs | CCS2, Type 2 AC | 22 kW AC; 60 kW – 360 kW ultra-fast DC | ChargeZone App, UPI, Cards, RFID | Live status in ChargeZone App; OCPP backend with closed B2B OCPI roaming | Web: `chargezone.co.in` · Android: `com.tecso.chargezone` · iOS: `id1571589255` · Phone: `1800 121 2025` · Email: `support@chargezone.co` |
| **Jio-bp pulse** | Expanding rapidly across fuel retail outlets & Nexus/commercial malls (Bengaluru, Mysuru, Mangaluru, highway NH 48 / NH 75) | CCS2, Type 2 AC | 7.4–22 kW AC; 60 kW – 120 kW+ DC | Jio-bp pulse App, UPI, Cards | Live status in Jio-bp pulse App; no public unauthenticated API | Web: `jiobp.com` · Android: `com.rbml.pulse` · iOS: `id1575807982` · Phone: `1800 890 9023` · Email: `evsupport.rbml@jiobp.com` |
| **BESCOM (EV Mithra)** | State Nodal Agency network concentrated in Bengaluru Urban/Rural & BESCOM jurisdiction | Bharat AC-001, Bharat DC-001, Type 2 AC, CCS2 | 3.3 kW, 15 kW Bharat DC, 25–60 kW CCS2 | EV Mithra App, UPI | Live status in EV Mithra app & BEE EV Yatra integration; no open developer API documented | Web: `bescom.karnataka.gov.in` · Android: `com.bescom.evmithra` · iOS: `id1588661858` · Phone: `1912` · Email: `bescomevsupport@bescom.co.in` |
| **Ather Grid** | Very dense 2-wheeler coverage in Bengaluru, Mysuru, Mangaluru, Udupi, Hubballi, Belagavi | Ather proprietary DC-pin connector (2W only; incompatible with 4W CCS2/Type 2) | ~1.5 km/min proprietary 2W fast charging (~1.5–3 kW) | Ather App | Live status in Ather App; vehicle-connector exclusivity (Ather 2W) | Web: `atherenergy.com` · Android: `com.atherenergy.manger` · Email: `customercare@atherenergy.com` |
| **Glida (formerly Fortum Charge & Drive India)** | Bengaluru, NH 48 / Hassan corridor (`Channarayapatna`/OSM verified Glida node), major metros | CCS2, CHAdeMO, Type 2 AC | 22 kW AC; 50–180 kW DC | Glida App, UPI, Cards | Live status in Glida App; OCPP/OCPI roaming ready for B2B | Web: `glida.in` · Phone: `1800 120 3578` · Email: `support@chargedrive.in` |
| **BPCL eDrive** | Fuel pumps on NH 48, NH 75, Mysuru/Bengaluru/Mangaluru corridors | CCS2, Type 2 AC, Bharat DC-001 | 7.4–22 kW AC; 30–60 kW DC | eDrive BPCL / Hello BPCL App, UPI | Live status in eDrive BPCL app; no public developer API | Web: `bharatpetroleum.in` · Android: `com.bpcl.driveapp` · Phone: `1800 22 4344` · Email: `support@hellobpcl.in` |
| **HPCL (HP eCharge)** | Fuel retail stations across Bengaluru, Mysuru, Mangaluru, Hubballi, Belagavi | CCS2, Type 2 AC, Bharat AC/DC | 7.4–22 kW AC; 30–60 kW DC | HP eCharge App, UPI | Live status in HP eCharge app; no public developer API | Web: `hindustanpetroleum.com` · Android: `com.hpcl.ev.charge` · Phone: `1800 2333 555` · Email: `hpclappadmin@hpcl.in` |
| **EESL / CESL** | Municipal & public-building installations (mostly earlier-generation Bharat AC/DC + select CCS2) | Bharat AC-001, Bharat DC-001, CCS2 | 3.3–15 kW, select 50 kW | Operated via state utility/partner apps (e.g., EV Mithra / ElectreeFi) | Often lacks real-time public feed; higher maintenance variability on older Bharat DC units | Web: `eeslindia.org` · Support via site kiosk / partner utility |
| **Kazam** | Commercial complexes, apartments, and semi-public AC/light-DC nodes in Bengaluru, Mysuru, coastal towns | 3-pin 16A AC (3.3 kW), Type 2 AC, select DC | 3.3 kW – 22 kW AC (mostly 2W/destination) | Kazam App, UPI | Live status in Kazam App; B2B SaaS CMS | Web: `kazam.energy` · Android: `com.kazam.ev` · Phone: `+91 99589 43092` · Email: `support@kazam.in` |
| **Relux Electric** | Highway hotels & South India corridors (Bengaluru–Mysuru, Tamil Nadu border) | CCS2, Type 2 AC | 22 kW AC; 30–60 kW DC | Relux Electric App, UPI | Live status in Relux App; no public developer API | Web: `reluxelectric.com` · Android: `com.relux.electric` · Phone: `+91 98848 66993` · Email: `enquiry@reluxelectric.com` |

*Additional Karnataka-relevant providers identified during OSM Overpass inspection:* **Shell Recharge**, **Honda e:swap** (2W battery swap), **Bolt.Earth** (3.3 kW destination points), **Yulu** (micro-mobility swap), **Magenta ChargeGrid**, **Hyundai / Kia dealer networks** (public CCS2 stations), and **KPTCL / Urja** standalone stations.

---

## 3. Corridor Deep Dive: Mysuru → Mangaluru

Two practical highway corridors connect **Mysuru (748 m elevation)** to **Mangaluru (27 m elevation)**:

### Corridor A — NH 275 via Kodagu (Scenic / Family Route, ~255 km)
`Mysuru → Hunsur / Bannikuppe → Kushalnagar → Madikeri (1,136 m) → Sampaje Ghat → Sullia → Puttur → Mangaluru`
- **Elevation & Energy Profile:** Continuous climb from Mysuru (748 m) to Madikeri (1,136 m, +388 m net climb over ~118 km) increases consumption by ~15%–22% on the ascent, while the Sampaje Ghat descent to Puttur/Mangaluru (~27 m) yields modest regenerative energy recovery.
- **Verified Charging Anchors:**
  1. **Mysuru Departure:** *Mall of Mysore* (Zeon 120 kW CCS2 + partner units, `12.29784, 76.66463`), *Southern Star Hotel* (Zeon 50/60 kW CCS2, `12.3086, 76.6531`), *Radisson Blu Plaza* (AC Type 2 destination).
  2. **Bannikuppe / Hunsur (~42 km from Mysuru):** *Sri Krishna Cafe, NH 275* (Tata Power EZ Charge 60 kW dual-gun CCS2) — family dining + quick top-up before Coorg climb.
  3. **Kushalnagar (~88 km from Mysuru):** *Zeon Charging — Tata Motors Urs Kar* (60 kW dual-gun CCS2, 24/7, restrooms & seating) and *Purple Palms Resort & Spa* (Zeon 30 kW CCS2).
  4. **Madikeri (~118 km from Mysuru):** *Tata Power — Taj Madikeri Resort & Spa* (30 kW DC, `12.4244, 75.7382`) and *Zeon — Club Mahindra Madikeri* (22 kW AC Type 2, `12.4413, 75.7164` — destination/resort access note).
  5. **Puttur (~203 km from Mysuru):** *Zeon Charging — Mahaveer Ventures* (up to 90 kW CCS2 + Type 2 AC) — crucial coastal-approach fast charger after descending Sampaje Ghat.
  6. **Mangaluru Destination (~255 km):** *Zeon — City Centre Mall* (`12.87142, 74.84250`, 60 kW CCS2), *Nexus Fiza Mall B1* (`12.85774, 74.83831`, Statiq/Jio-bp 60 kW+ CCS2), *Tata Power — Jubilant Autoworks Kuloor*, *Tata Power — Cauvery Motors Padil* (25 kW CCS2).

### Corridor B — NH 75 via Hassan & Sakleshpur (~275–290 km via Holenarasipura–Hassan)
`Mysuru → Holenarasipura → Hassan → Sakleshpur → Shiradi Ghat → Uppinangady → Mangaluru`
- **Verified Charging Anchors:** Hassan junctions (*Tata Power — Automatrix NH 75*, *Statiq x TATA.ev — Hotel Shivsurya*, *Statiq — Gajanan BPCL Bypass*), *Glida* node on NH 75 (`12.96626, 76.78851`, OSM-verified), Sakleshpur (*Tata Power — Srinivasa Residency* area), and Mangaluru arrival hubs.

---

## 4. Key Market Friction & ChargeWise Product Opportunities

1. **Fragmented App Ecosystem:** Drivers must juggle 4–6 apps (Tata Power, Zeon, Statiq, Jio-bp, EV Mithra) because no public unauthenticated OCPI directory exists for consumers in India. ChargeWise provides unified discovery + direct deep links/store links + support phones/emails while transparently stating when manual app search is required.
2. **Untrusted "Available" Badges:** Many aggregators show stale or unverified "Available" labels. ChargeWise strictly enforces a 6-state verification trust model where **Unknown ≠ Available**.
3. **2-Wheeler vs 4-Wheeler Connector Traps:** Ather Grid and Honda e:swap stations appear on generic maps but cannot charge a CCS2/Type 2 car. ChargeWise strictly validates connector compatibility.
4. **Family Amenities & Ghat Anxiety:** Charging a family car for 30–45 minutes on a highway requires restrooms, clean food, or shaded seating—and Ghat climbs require elevation-aware reserve buffers rather than naive 150 km fixed-interval rules.
