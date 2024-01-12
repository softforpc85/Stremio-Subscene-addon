const tmdb = require('./tmdb');
const kitsu = require('./kitsu');
const subscene = require('./subsceneAPI');
const config = require('./config');
require('dotenv').config();
const languages = require('./languages.json');
const count = 10;
const NodeCache = require("node-cache");
const sub2vtt = require('sub2vtt');
const { forEach } = require('sub2vtt/ISO639');


const Cache = new NodeCache({ stdTTL: (0.5 * 10 * 60), checkperiod: (10 * 1 * 60) }); // chứa link sub
const MetaCache = new NodeCache({ stdTTL: (0.5 * 10 * 60), checkperiod: (10 * 1 * 60) });
const KitsuCache = new NodeCache({ stdTTL: (0.5 * 10 * 60), checkperiod: (10 * 1 * 60) });
const filesCache =  new NodeCache({ stdTTL: (0.5 * 10 * 60), checkperiod: (10 * 1 * 60) }); //chứa file sub
const subsceneCache = new NodeCache({ stdTTL: (0.5 * 10 * 60), checkperiod: (10 * 1 * 60) });
const searchCache = new NodeCache({ stdTTL: (0.5 * 60 * 60), checkperiod: (1 * 60 * 60) });


async function subtitles(type, id, lang) {
    if (id.match(/tt[0-9]/)){
		return await (TMDB(type, id, lang)) 
	}	if (id.match(/kitsu:[0-9]/)){
        return await (Kitsu(type, id, lang)) 
		//console.log(type, id, lang)
	}
}
async function Kitsu(type, id, lang) {
    console.log(type, id, lang);
    let metaid = id.split(':')[1];
    let meta = KitsuCache.get(metaid);
    if (!meta) {
        meta = await kitsu(metaid);
        if (meta) {
            KitsuCache.set(metaid, meta);
        }
    }
    if(meta){
        //console.log(meta)
        const episode = id.split(':')[2];
        const searchID = `kitisu_${metaid}_${id.split(':')[1]}`;
        let search = searchCache.get(searchID);
        let slug = `${meta.title["en_jp"]} (${meta.title["en"]}) (${meta.year})`;
        var moviePath = '';
        console.log('slug',slug)
        console.log('title',meta.title["en_jp"])
        if (!search) {
            search = await subscene.search(`${encodeURIComponent(meta.title["en_jp"])}`);
            if (search) {
                searchCache.set(searchID, search);
            }
        }
        for(let i = 0; i<search.length;i++){
            if(search[i].title.includes(meta.title["en_jp"])){
                moviePath = search[i].path
                break
            }
        }
        //let moviePath = search[0].path;
        console.log(moviePath)
        return getsubtitles(moviePath, meta.slug.replace('-','_'), lang, episode)
    }
}

async function TMDB(type, id, lang) {
    console.log(type, id, lang);
    let metaid = id.split(':')[0];
    let meta = MetaCache.get(metaid);
    if (!meta) {
        meta = await tmdb(type, metaid);
        if (meta) {
            MetaCache.set(metaid, meta);
        }
    }
    if(meta){
    //console.log("meta",meta)
    if (type == "movie") {
      let moviePath = `/subtitles/${meta.slug}`;
      //console.log(moviePath);
      return getsubtitles(moviePath, id, lang, null, meta.year)
    }
    else if (type == "series") {
      let season = parseInt(id.split(':')[1]);
      season = ordinalInWord(season);
      const episode = id.split(':')[2];

      const searchID = `${metaid}_${id.split(':')[1]}`;
      //console.log("searchID : " , searchID);
      //console.log("meta ??? : " , metaid);

      let search = searchCache.get(searchID);
      if (!search) {
        search = await subscene.search(`${meta.title} ${season} season`);
        if (search) {
          searchCache.set(searchID, search);
        }
      }
      let moviePath = search[0].path;
      return getsubtitles(moviePath, id.split(":")[0] + '_season_' + id.split(":")[1], lang, episode)
      /*
      var moviePath = '/subtitles/' + meta.slug + '-' + season + '-season';
      let subtitles = await subscene.getSubtitles(moviePath).catch(error => { console.error(error) })
      console.log('subtitles', Object.keys(subtitles).length)
      if (!Object.keys(subtitles).length) {
          moviePath = '/subtitles/' + meta.slug;
      }
      if(meta.slug=='the-100'){
          moviePath = `/subtitles/the-100-the-hundred-${season}-season`;
      }
      console.log(moviePath);
      return await sleep(2000).then(() => { return getsubtitles(moviePath, id.split(":")[0] + '_season_' + id.split(":")[1], lang, episode) })
      function sleep(ms) {
          return new Promise((resolve) => {
              setTimeout(resolve, ms);
          });
      }*/
    }
  }
}


async function getsubtitles(moviePath, id, lang, episode, year) {

  let breakTitle = moviePath.match(/[a-z]+/gi)
  //console.log("breakTitle : " , breakTitle)
  console.log(moviePath, id, lang, year, episode)
  const cachID = `${id}_${lang}`;
  let cached = Cache.get(cachID);
  if (cached) {
    console.log('cached main', cachID, cached);
    return cached
  } else {
    let subs = [];
    console.log(moviePath)

    var subtitles = subsceneCache.get(moviePath);
    if (!subtitles) {
      let subs1 = await subscene.getSubtitles(moviePath).catch(error => { console.error(error) }) // moviepath without year
      console.log("no year scraping :", subs1.length)
      if (subs1[0].year !== year && !episode) { // if a movie and year isnt matched with the one in imdb
        await new Promise((r) => setTimeout(r, 2000)); // prevent too many request, still finding the other way
        let subs2 = await subscene.getSubtitles(moviePath + "-" + year).catch(error => { console.error(error) }) // moviepath with year
        console.log("with year scraping :", subs2.length)
        subs1 = subs1.concat(subs2);
      }
      subtitles = subscene.sortByLang(subs1)
      if (subtitles) {
        subsceneCache.set(moviePath, subtitles);
      }
    }
    console.log('subtitles', Object.keys(subtitles).length)
    console.log('moviePath', moviePath)
    if (subtitles[lang]) {
      subtitles = subtitles[lang];
      console.log('subtitles matched lang : ',subtitles.length)
      let sub = [];
      let episodeText;
      if (episode) {
        episodeText = (episode.length == 1) ? ('0' + episode) : episode;
        episodeText = 'E' + episodeText
        console.log('episode', episodeText)
        subtitles.forEach(element => {
          if (element.title.match(/S\d\d\w\d/gi)) {
            
            var reg = new RegExp(episodeText.toLowerCase(), 'gi');
            if (reg.test(element.title.toLowerCase())) {
              console.log(element.title);
                sub.push(element);
            }
          } else {
            console.log(element.title);
            sub.push(element)
          }
        })
        
        //sub = filtered(subtitles, 'title', episodeText)
        //episodeText = episode.length == 1 ? '0' + episode : episode;
        //sub = sub.concat(filtered(subtitles, 'title', episodeText))
        sub = [...new Set(sub)];
        subtitles = sub;
      }
      console.log("filtered subs ", subtitles.length)

      for (let i = 0; i < (subtitles.length > subtitles.length); i++) {
        let value = subtitles[i];
        let simpleTitle = subtitles[i].title;
        breakTitle.forEach(el => {
        var regEx = new RegExp(el, "ig");
          simpleTitle = simpleTitle.replace(regEx,"")
        })
        simpleTitle = simpleTitle.replace(/\W/gi,"") // kasih gambaran di stremio
        let proxy =  {responseType: "buffer"};
        let type =  "Test";
        if (value) {
            let path = config.BaseURL + value.path; //PATH : trang subscene co chua link down sub
            //console.log("PATH ? : ", path)
            if (episode) {
              url = config.local+"/sub.vtt?"+"episode="+episodeText+"&"+sub2vtt.gerenateUrl(path,proxy,type);
            } else {
              url = config.local+"/sub.vtt?"+sub2vtt.gerenateUrl(path,proxy,type);
            }
            console.log("URL ? : ", url)
            //Dua sub len phim dang xem, fix loi cached
            subs.push({
                lang: languages[lang].iso || languages[lang].id,
                //id: "subscn_"+episode?`${cachID}_ep${episode}_${i}`:`${cachID}_${i}`,
                title:subtitles[i].title,
                id: "s."+`${i}`+"."+`${episodeText}`+ simpleTitle,
                url: url
            });
        }
    }
    let cached = Cache.set(cachID, subs);
    console.log("cached", cached)
    return subs;
}else{
    return
}
}
}

async function downloadUrl(path, episode) {
let cachID = episode ? path + '_' + episode : path;
let cached = filesCache.get(cachID);
if (cached) {
console.log('File already cached', cachID);
return cached
console.log("Doc file cached : ", cached)
} else {
return subscene.downloadUrl(path).then(url => {
    let cached = filesCache.set(cachID, url);
    console.log("Caching File URL :", url)
    return url;
}).catch(error => { console.log(error) });
}
}


function filtered(list, key, value) {
var filtered = [], i = list.length;
var reg = new RegExp(value.toLowerCase(), 'gi');
while (i--) {
if (reg.test(list[i][key].toLowerCase())) {
    filtered.push(list[i]);
}
}
return filtered;
};

function ordinalInWord(cardinal) {
const ordinals = ["zeroth", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth", "Twentieth"]

var tens = {
20: 'twenty',
30: 'thirty',
40: 'forty',
50: 'Fifty',
60: 'Sixty',
70: 'Seventy',
80: 'Eighty',
90: 'Ninety'

};
var ordinalTens = {
30: 'thirtieth',
40: 'fortieth',
50: 'fiftieth',
60: 'Sixtieth',
70: 'Seventieth',
80: 'Eightieth',
90: 'Ninetieth'
};

if (cardinal <= 20) {
return ordinals[cardinal];
}

if (cardinal % 10 === 0) {
return ordinalTens[cardinal];
}

return tens[cardinal - (cardinal % 10)] + ordinals[cardinal % 10];
}


module.exports = { subtitles, downloadUrl };
