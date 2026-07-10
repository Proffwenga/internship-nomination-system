// Rules for the "Vernacular Placement?" field on a student nomination.
//
// Rule 1 — TV vernacular stations: if the department is Editorial or TV
// Production and the area of interest is Inooro TV or Ramogi TV, the
// vernacular placement defaults to Yes, with the language locked to the
// one that station broadcasts in (still shown as a dropdown, not fixed
// text, per the original request).
//
// Rule 2 — Radio/Digital: if the department is Radio (Digital &
// Programming) or Digital and the officer manually marks the placement as
// vernacular, a dropdown of the department's working languages is shown
// with no default — the officer picks the one that applies.
module.exports = {
  TV_VERNACULAR_DEPARTMENTS: ['Editorial', 'TV Production'],
  TV_VERNACULAR_AREA_LANGUAGE: { 'Inooro TV': 'Kikuyu', 'Ramogi TV': 'Luo' },
  RADIO_DIGITAL_VERNACULAR_DEPARTMENTS: ['Radio (Digital & Programming)', 'Digital'],
  RADIO_DIGITAL_VERNACULAR_LANGUAGES: [
    'Luo', 'Kikuyu', 'Kamba', 'Meru', 'Embu', 'Kalenjin', 'Kisii', 'Giriama', 'Maragoli', 'Wanga', 'Bukusu',
  ],
};
