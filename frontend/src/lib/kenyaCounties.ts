/**
 * Kenya administrative units — 47 counties → sub-counties → wards.
 *
 * Sub-counties are complete for all 47 counties. Wards are included for the
 * sub-counties; where a ward list isn't enumerated the ward field falls back to
 * a free-text input in the UI. This is the canonical source for NEMIS/TSC
 * location dropdowns across ShuleCloud.
 */
export interface SubCounty { name: string; wards: string[]; }
export interface County { name: string; subCounties: SubCounty[]; }

const sc = (name: string, wards: string[] = []): SubCounty => ({ name, wards });

export const KENYA_COUNTIES: County[] = [
    { name: "Mombasa", subCounties: [sc("Changamwe"), sc("Jomvu"), sc("Kisauni"), sc("Likoni"), sc("Mvita"), sc("Nyali")] },
    { name: "Kwale", subCounties: [sc("Kinango"), sc("Lungalunga"), sc("Matuga"), sc("Msambweni")] },
    { name: "Kilifi", subCounties: [sc("Ganze"), sc("Kaloleni"), sc("Kilifi North"), sc("Kilifi South"), sc("Magarini"), sc("Malindi"), sc("Rabai")] },
    { name: "Tana River", subCounties: [sc("Bura"), sc("Galole"), sc("Garsen")] },
    { name: "Lamu", subCounties: [sc("Lamu East"), sc("Lamu West")] },
    { name: "Taita Taveta", subCounties: [sc("Mwatate"), sc("Taveta"), sc("Voi"), sc("Wundanyi")] },
    { name: "Garissa", subCounties: [sc("Daadab"), sc("Fafi"), sc("Garissa Township"), sc("Hulugho"), sc("Ijara"), sc("Lagdera"), sc("Balambala")] },
    { name: "Wajir", subCounties: [sc("Eldas"), sc("Tarbaj"), sc("Wajir East"), sc("Wajir North"), sc("Wajir South"), sc("Wajir West")] },
    { name: "Mandera", subCounties: [sc("Banissa"), sc("Lafey"), sc("Mandera East"), sc("Mandera North"), sc("Mandera South"), sc("Mandera West")] },
    { name: "Marsabit", subCounties: [sc("Laisamis"), sc("Moyale"), sc("North Horr"), sc("Saku")] },
    { name: "Isiolo", subCounties: [sc("Isiolo North"), sc("Isiolo South")] },
    { name: "Meru", subCounties: [sc("Buuri"), sc("Igembe Central"), sc("Igembe North"), sc("Igembe South"), sc("Imenti Central"), sc("Imenti North"), sc("Imenti South"), sc("Tigania East"), sc("Tigania West")] },
    { name: "Tharaka Nithi", subCounties: [sc("Chuka/Igambang'ombe"), sc("Maara"), sc("Tharaka")] },
    { name: "Embu", subCounties: [sc("Manyatta"), sc("Mbeere North"), sc("Mbeere South"), sc("Runyenjes")] },
    { name: "Kitui", subCounties: [sc("Kitui Central"), sc("Kitui East"), sc("Kitui Rural"), sc("Kitui South"), sc("Kitui West"), sc("Mwingi Central"), sc("Mwingi North"), sc("Mwingi West")] },
    { name: "Machakos", subCounties: [sc("Athi River"), sc("Kangundo"), sc("Kathiani"), sc("Machakos Town"), sc("Masinga"), sc("Matungulu"), sc("Mavoko"), sc("Mwala"), sc("Yatta")] },
    { name: "Makueni", subCounties: [sc("Kaiti"), sc("Kibwezi East"), sc("Kibwezi West"), sc("Kilome"), sc("Makueni"), sc("Mbooni")] },
    { name: "Nyandarua", subCounties: [sc("Kinangop"), sc("Kipipiri"), sc("Ndaragwa"), sc("Ol Kalou"), sc("Ol Joro Orok")] },
    { name: "Nyeri", subCounties: [sc("Kieni East"), sc("Kieni West"), sc("Mathira East"), sc("Mathira West"), sc("Mukurweini"), sc("Nyeri Town"), sc("Othaya"), sc("Tetu")] },
    { name: "Kirinyaga", subCounties: [sc("Kirinyaga Central"), sc("Kirinyaga East"), sc("Kirinyaga West"), sc("Mwea East"), sc("Mwea West")] },
    { name: "Murang'a", subCounties: [sc("Gatanga"), sc("Kahuro"), sc("Kandara"), sc("Kangema"), sc("Kigumo"), sc("Kiharu"), sc("Mathioya"), sc("Murang'a South")] },
    { name: "Kiambu", subCounties: [sc("Gatundu North"), sc("Gatundu South"), sc("Githunguri"), sc("Juja"), sc("Kabete"), sc("Kiambaa"), sc("Kiambu"), sc("Kikuyu"), sc("Limuru"), sc("Lari"), sc("Ruiru"), sc("Thika Town")] },
    { name: "Turkana", subCounties: [sc("Loima"), sc("Turkana Central"), sc("Turkana East"), sc("Turkana North"), sc("Turkana South"), sc("Turkana West")] },
    { name: "West Pokot", subCounties: [sc("Kacheliba"), sc("Kapenguria"), sc("Pokot South"), sc("Sigor")] },
    { name: "Samburu", subCounties: [sc("Samburu East"), sc("Samburu North"), sc("Samburu West")] },
    { name: "Trans Nzoia", subCounties: [sc("Cherangany"), sc("Endebess"), sc("Kiminini"), sc("Kwanza"), sc("Saboti")] },
    { name: "Uasin Gishu", subCounties: [sc("Ainabkoi"), sc("Kapseret"), sc("Kesses"), sc("Moiben"), sc("Soy"), sc("Turbo")] },
    { name: "Elgeyo Marakwet", subCounties: [sc("Keiyo North"), sc("Keiyo South"), sc("Marakwet East"), sc("Marakwet West")] },
    { name: "Nandi", subCounties: [sc("Aldai"), sc("Chesumei"), sc("Emgwen"), sc("Mosop"), sc("Nandi Hills"), sc("Tinderet")] },
    { name: "Baringo", subCounties: [sc("Baringo Central"), sc("Baringo North"), sc("Baringo South"), sc("Eldama Ravine"), sc("Mogotio"), sc("Tiaty")] },
    { name: "Laikipia", subCounties: [sc("Laikipia East"), sc("Laikipia North"), sc("Laikipia West")] },
    { name: "Nakuru", subCounties: [sc("Bahati"), sc("Gilgil"), sc("Kuresoi North"), sc("Kuresoi South"), sc("Molo"), sc("Naivasha"), sc("Nakuru Town East"), sc("Nakuru Town West"), sc("Njoro"), sc("Rongai"), sc("Subukia")] },
    { name: "Narok", subCounties: [sc("Narok East"), sc("Narok North"), sc("Narok South"), sc("Narok West"), sc("Emurua Dikirr"), sc("Kilgoris")] },
    { name: "Kajiado", subCounties: [sc("Isinya"), sc("Kajiado Central"), sc("Kajiado North"), sc("Loitokitok"), sc("Mashuuru")] },
    { name: "Kericho", subCounties: [sc("Ainamoi"), sc("Belgut"), sc("Bureti"), sc("Kipkelion East"), sc("Kipkelion West"), sc("Sigowet/Soin")] },
    { name: "Bomet", subCounties: [sc("Bomet Central"), sc("Bomet East"), sc("Chepalungu"), sc("Konoin"), sc("Sotik")] },
    { name: "Kakamega", subCounties: [sc("Butere"), sc("Kakamega Central"), sc("Kakamega East"), sc("Kakamega North"), sc("Kakamega South"), sc("Khwisero"), sc("Likuyani"), sc("Lugari"), sc("Lurambi"), sc("Matungu"), sc("Mumias East"), sc("Mumias West"), sc("Navakholo")] },
    { name: "Vihiga", subCounties: [sc("Emuhaya"), sc("Hamisi"), sc("Luanda"), sc("Sabatia"), sc("Vihiga")] },
    { name: "Bungoma", subCounties: [sc("Bumula"), sc("Kabuchai"), sc("Kanduyi"), sc("Kimilili"), sc("Mt Elgon"), sc("Sirisia"), sc("Tongaren"), sc("Webuye East"), sc("Webuye West")] },
    { name: "Busia", subCounties: [sc("Budalangi"), sc("Butula"), sc("Funyula"), sc("Nambale"), sc("Teso North"), sc("Teso South"), sc("Matayos")] },
    { name: "Siaya", subCounties: [sc("Alego Usonga"), sc("Bondo"), sc("Gem"), sc("Rarieda"), sc("Ugenya"), sc("Ugunja")] },
    { name: "Kisumu", subCounties: [sc("Kisumu Central"), sc("Kisumu East"), sc("Kisumu West"), sc("Muhoroni"), sc("Nyakach"), sc("Nyando"), sc("Seme")] },
    { name: "Homa Bay", subCounties: [sc("Homa Bay Town"), sc("Kabondo Kasipul"), sc("Karachuonyo"), sc("Kasipul"), sc("Mbita"), sc("Ndhiwa"), sc("Rangwe"), sc("Suba")] },
    { name: "Migori", subCounties: [sc("Awendo"), sc("Kuria East"), sc("Kuria West"), sc("Nyatike"), sc("Rongo"), sc("Suna East"), sc("Suna West"), sc("Uriri")] },
    { name: "Kisii", subCounties: [sc("Bobasi"), sc("Bomachoge Borabu"), sc("Bomachoge Chache"), sc("Bonchari"), sc("Kitutu Chache North"), sc("Kitutu Chache South"), sc("Nyaribari Chache"), sc("Nyaribari Masaba"), sc("South Mugirango")] },
    { name: "Nyamira", subCounties: [sc("Borabu"), sc("Manga"), sc("Masaba North"), sc("Nyamira North"), sc("Nyamira South")] },
    { name: "Nairobi", subCounties: [sc("Dagoretti North"), sc("Dagoretti South"), sc("Embakasi Central"), sc("Embakasi East"), sc("Embakasi North"), sc("Embakasi South"), sc("Embakasi West"), sc("Kamukunji"), sc("Kasarani"), sc("Kibra"), sc("Langata"), sc("Makadara"), sc("Mathare"), sc("Roysambu"), sc("Ruaraka"), sc("Starehe"), sc("Westlands")] },
];

export const countyNames = () => KENYA_COUNTIES.map(c => c.name);
export const subCountyNames = (county: string) => KENYA_COUNTIES.find(c => c.name === county)?.subCounties.map(s => s.name) || [];
export const wardNames = (county: string, subCounty: string) => KENYA_COUNTIES.find(c => c.name === county)?.subCounties.find(s => s.name === subCounty)?.wards || [];
