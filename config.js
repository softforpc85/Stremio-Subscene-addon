var env = process.env.NODE_ENV ? 'render':'local';

var config = {
    BaseURL: "https://subscene.com",
    APIURL: 'https://api.themoviedb.org/3',
    kitsuURL: 'https://kitsu.io/api/edge',
    CacheControl :{
        oneDay: 'max-age=86400, must-revalidate, stale-while-revalidate=1800, stale-if-error=1800, public',
        oneHour: 'max-age=3600, must-revalidate, stale-while-revalidate=1800, stale-if-error=1800, public',
        off: 'no-cache, no-store, must-revalidate'
    }
}

switch (env) {
    case 'render':
		config.port = process.env.PORT || 63555
        config.local = process.env.PRE_URL || "https://stremioaddon-q45r.onrender.com";
        break;

    case 'local':
		config.port = 63555
        config.local = "http://127.0.0.1:" + config.port;
        break;
}

module.exports = config;
