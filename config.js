var env = process.env.NODE_ENV ? 'vercel':'local';

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
    case 'vercel':
		config.port = process.env.PORT || 10885
        config.local = process.env.PRE_URL || "stremio-subscene-addon.vercel.app";
        break;

    case 'local':
		config.port = 10885
        config.local = "http://127.0.0.1:" + config.port;
        break;
}

module.exports = config;
