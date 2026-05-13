/* ============================================================
   ACTS DATA — edit per round.

   `show`           One of: 'semi-1', 'semi-2', 'grand-final'.
                    Drives the show name shown in the subtitle and
                    used in the downloaded results filename.
   `performing`     Acts appearing in the selected show, in their
                    running order. This array's order determines
                    the order acts are presented to voters.
   `notPerforming`  Acts not appearing in the selected show.
                    Hidden from the voting queue and rated table.
                    Their stored votes are preserved in localStorage
                    so moving an act back to `performing` restores
                    their previous ratings.
   ============================================================ */
window.EUROVISION_DATA = {
  show: 'grand-final',

  performing: [
    {code:'MD', country:'Moldova',            flag:'🇲🇩', performer:'Satoshi',                            song:'Viva, Moldova!'},
    {code:'HR', country:'Croatia',            flag:'🇭🇷', performer:'LELEK',                              song:'Andromeda'},
    {code:'GE', country:'Georgia',            flag:'🇬🇪', performer:'Bzikebi',                            song:'On Replay'},
    {code:'GR', country:'Greece',             flag:'🇬🇷', performer:'Akylas',                             song:'Ferto'},
    {code:'SE', country:'Sweden',             flag:'🇸🇪', performer:'FELICIA',                            song:'My System'},
    {code:'BE', country:'Belgium',            flag:'🇧🇪', performer:'ESSYLA',                             song:'Dancing on the Ice'},
    {code:'FI', country:'Finland',            flag:'🇫🇮', performer:'Linda Lampenius x Pete Parkkonen',   song:'Liekinheitin'},
    {code:'IL', country:'Israel',             flag:'🇮🇱', performer:'Noam Bettan',                        song:'Michelle'},
    {code:'LT', country:'Lithuania',          flag:'🇱🇹', performer:'Lion Ceccah',                        song:'Sólo Quiero Más'},
    {code:'PL', country:'Poland',             flag:'🇵🇱', performer:'ALICJA',                             song:'Pray'},
    {code:'AL', country:'Albania',            flag:'🇦🇱', performer:'Alis',                               song:'Nân'},
    {code:'AM', country:'Armenia',            flag:'🇦🇲', performer:'SIMÓN',                              song:'Paloma Rumba'},
    {code:'AU', country:'Australia',          flag:'🇦🇺', performer:'Delta Goodrem',                      song:'Eclipse'},
    {code:'AT', country:'Austria',            flag:'🇦🇹', performer:'COSMÓ',                              song:'Tanzschein'},
    {code:'AZ', country:'Azerbaijan',         flag:'🇦🇿', performer:'JIVA',                               song:'Just Go'},
    {code:'BG', country:'Bulgaria',           flag:'🇧🇬', performer:'DARA',                               song:'Bangaranga'},
    {code:'CY', country:'Cyprus',             flag:'🇨🇾', performer:'Antigoni',                           song:'JALLA'},
    {code:'CZ', country:'Czechia',            flag:'🇨🇿', performer:'Daniel Zizka',                       song:'CROSSROADS'},
    {code:'DK', country:'Denmark',            flag:'🇩🇰', performer:'Søren Torpegaard Lund',              song:'Før Vi Går Hjem'},
    {code:'EE', country:'Estonia',            flag:'🇪🇪', performer:'Vanilla Ninja',                      song:'Too Epic To Be True'},
    {code:'FR', country:'France',             flag:'🇫🇷', performer:'Monroe',                             song:'Regarde !'},
    {code:'DE', country:'Germany',            flag:'🇩🇪', performer:'Sarah Engels',                       song:'Fire'},
    {code:'IT', country:'Italy',              flag:'🇮🇹', performer:'Sal Da Vinci',                       song:'Per Sempre Sì'},
    {code:'LV', country:'Latvia',             flag:'🇱🇻', performer:'Atvara',                             song:'Ēnā'},
    {code:'LU', country:'Luxembourg',         flag:'🇱🇺', performer:'Eva Marija',                         song:'Mother Nature'},
    {code:'MT', country:'Malta',              flag:'🇲🇹', performer:'AIDAN',                              song:'Bella'},
    {code:'ME', country:'Montenegro',         flag:'🇲🇪', performer:'Tamara Živković',                    song:'Nova Zora'},
    {code:'NO', country:'Norway',             flag:'🇳🇴', performer:'JONAS LOVV',                         song:'YA YA YA'},
    {code:'PT', country:'Portugal',           flag:'🇵🇹', performer:'Bandidos do Cante',                  song:'Rosa'},
    {code:'RO', country:'Romania',            flag:'🇷🇴', performer:'Alexandra Căpitănescu',              song:'Choke Me'},
    {code:'SM', country:'San Marino',         flag:'🇸🇲', performer:'SENHIT',                             song:'Superstar'},
    {code:'RS', country:'Serbia',             flag:'🇷🇸', performer:'LAVINA',                             song:'Kraj Mene'},
    {code:'CH', country:'Switzerland',        flag:'🇨🇭', performer:'Veronica Fusaro',                    song:'Alice'},
    {code:'UA', country:'Ukraine',            flag:'🇺🇦', performer:'LELÉKA',                             song:'Ridnym'},
    {code:'GB', country:'United Kingdom',     flag:'🇬🇧', performer:'LOOK MUM NO COMPUTER',               song:'Eins, Zwei, Drei'}
  ],

  notPerforming: []
};

window.EUROVISION_SHOW_NAMES = {
  'semi-1':      'Semi-Final 1',
  'semi-2':      'Semi-Final 2',
  'grand-final': 'Grand Final'
};
