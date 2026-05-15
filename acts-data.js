/* ============================================================
   ACTS DATA

   `show`     Active show. One of: 'semi-1', 'semi-2', 'grand-final'.
              Drives the show name shown in the header subtitle and
              used in the downloaded results filename.

   `shows`    Running order for each show, as a list of country
              codes in performance order. To change the order, just
              move codes around in the array. To add/remove an act
              from a show, add/delete its code. Codes must exist
              in the `acts` roster below; unknown codes are skipped
              with a console warning.
              An empty array means "use every act in the roster in
              the order they appear below" — convenient for showing
              the full field before the official running order is
              announced.

   `acts`     Master roster. Defined once per contest. Keep keys
              alphabetical by country for easy scanning. Edit only
              when an act is announced, withdrawn, or changes
              performer/song. The order of acts here is also the
              default order used when a `shows` entry is empty.
   ============================================================ */
window.EUROVISION_DATA = {
  show: 'semi-2',

  shows: {
    'semi-1':      ['MD','SE','HR','GR','PT','GE','IT','FI','ME','EE','IL','DE','BE','LT','SM','PL','RS'],
    'semi-2':      ['BG','AZ','RO','LU','CZ','FR','AM','CH','CY','AT','LV','DK','AU','UA','GB','AL','MT','NO'],
    'grand-final': ['DK','DE','IL','BE','AL','GR','UA','AU','RS','MT','CZ','BG','HR','GB','FR','MD','FI','PL','LT','SE','CY','IT','NO','RO','AT']
  },

  acts: {
    AL: {country:'Albania',            flag:'🇦🇱', performer:'Alis',                            song:'Nân'},
    AM: {country:'Armenia',            flag:'🇦🇲', performer:'SIMÓN',                           song:'Paloma Rumba'},
    AU: {country:'Australia',          flag:'🇦🇺', performer:'Delta Goodrem',                   song:'Eclipse'},
    AT: {country:'Austria',            flag:'🇦🇹', performer:'COSMÓ',                           song:'Tanzschein'},
    AZ: {country:'Azerbaijan',         flag:'🇦🇿', performer:'JIVA',                            song:'Just Go'},
    BE: {country:'Belgium',            flag:'🇧🇪', performer:'ESSYLA',                          song:'Dancing on the Ice'},
    BG: {country:'Bulgaria',           flag:'🇧🇬', performer:'DARA',                            song:'Bangaranga'},
    HR: {country:'Croatia',            flag:'🇭🇷', performer:'LELEK',                           song:'Andromeda'},
    CY: {country:'Cyprus',             flag:'🇨🇾', performer:'Antigoni',                        song:'JALLA'},
    CZ: {country:'Czechia',            flag:'🇨🇿', performer:'Daniel Zizka',                    song:'CROSSROADS'},
    DK: {country:'Denmark',            flag:'🇩🇰', performer:'Søren Torpegaard Lund',           song:'Før Vi Går Hjem'},
    EE: {country:'Estonia',            flag:'🇪🇪', performer:'Vanilla Ninja',                   song:'Too Epic To Be True'},
    FI: {country:'Finland',            flag:'🇫🇮', performer:'Linda Lampenius x Pete Parkkonen',song:'Liekinheitin'},
    FR: {country:'France',             flag:'🇫🇷', performer:'Monroe',                          song:'Regarde !'},
    GE: {country:'Georgia',            flag:'🇬🇪', performer:'Bzikebi',                         song:'On Replay'},
    DE: {country:'Germany',            flag:'🇩🇪', performer:'Sarah Engels',                    song:'Fire'},
    GR: {country:'Greece',             flag:'🇬🇷', performer:'Akylas',                          song:'Ferto'},
    IL: {country:'Israel',             flag:'🇮🇱', performer:'Noam Bettan',                     song:'Michelle'},
    IT: {country:'Italy',              flag:'🇮🇹', performer:'Sal Da Vinci',                    song:'Per Sempre Sì'},
    LV: {country:'Latvia',             flag:'🇱🇻', performer:'Atvara',                          song:'Ēnā'},
    LT: {country:'Lithuania',          flag:'🇱🇹', performer:'Lion Ceccah',                     song:'Sólo Quiero Más'},
    LU: {country:'Luxembourg',         flag:'🇱🇺', performer:'Eva Marija',                      song:'Mother Nature'},
    MT: {country:'Malta',              flag:'🇲🇹', performer:'AIDAN',                           song:'Bella'},
    MD: {country:'Moldova',            flag:'🇲🇩', performer:'Satoshi',                         song:'Viva, Moldova!'},
    ME: {country:'Montenegro',         flag:'🇲🇪', performer:'Tamara Živković',                 song:'Nova Zora'},
    NO: {country:'Norway',             flag:'🇳🇴', performer:'JONAS LOVV',                      song:'YA YA YA'},
    PL: {country:'Poland',             flag:'🇵🇱', performer:'ALICJA',                          song:'Pray'},
    PT: {country:'Portugal',           flag:'🇵🇹', performer:'Bandidos do Cante',               song:'Rosa'},
    RO: {country:'Romania',            flag:'🇷🇴', performer:'Alexandra Căpitănescu',           song:'Choke Me'},
    SM: {country:'San Marino',         flag:'🇸🇲', performer:'SENHIT',                          song:'Superstar'},
    RS: {country:'Serbia',             flag:'🇷🇸', performer:'LAVINA',                          song:'Kraj Mene'},
    SE: {country:'Sweden',             flag:'🇸🇪', performer:'FELICIA',                         song:'My System'},
    CH: {country:'Switzerland',        flag:'🇨🇭', performer:'Veronica Fusaro',                 song:'Alice'},
    UA: {country:'Ukraine',            flag:'🇺🇦', performer:'LELÉKA',                          song:'Ridnym'},
    GB: {country:'United Kingdom',     flag:'🇬🇧', performer:'LOOK MUM NO COMPUTER',            song:'Eins, Zwei, Drei'}
  }
};

window.EUROVISION_SHOW_NAMES = {
  'semi-1':      'Semi-Final 1',
  'semi-2':      'Semi-Final 2',
  'grand-final': 'Grand Final'
};

/**
 * Resolves the active show's running order against the roster.
 * Returns array of act objects: {code, country, flag, performer, song}.
 * Codes in the show list that aren't in the roster are skipped with a warning.
 */
window.eurovisionResolveActs = function () {
  const data = window.EUROVISION_DATA || {};
  const roster = data.acts || {};
  const showOrder = (data.shows && data.shows[data.show]) || [];
  const codes = showOrder.length ? showOrder : Object.keys(roster);
  const out = [];
  codes.forEach(code => {
    const a = roster[code];
    if (!a) {
      console.warn('[acts-data] Unknown act code in show "' + data.show + '":', code);
      return;
    }
    out.push(Object.assign({code: code}, a));
  });
  return out;
};
