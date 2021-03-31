const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors')
var SpotifyWebApi = require('spotify-web-api-node');
const axios = require('axios');

const app = express()
const credentials = require('./credentials');
var corsOptions = {
    origin: 'http://localhost:8081',
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204 
}
const MAXBOX_ACCESS_TOKEN = credentials.mapbox;
let exploreArtists = [];

app.use(bodyParser.json());
app.use(cors(corsOptions));


var spotifyApi = new SpotifyWebApi({
    clientId: credentials.spotifyId,
    clientSecret: credentials.spotifySecret
});


function newToken() {
    spotifyApi.clientCredentialsGrant().then(
        data => {
            console.log('The access token expires in ' + data.body['expires_in']);
            console.log('The access token is ' + data.body['access_token']);

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
        },
        err => {
            console.log(
                'Something went wrong when retrieving an access token',
                err.message
            );
        }
    );
}

newToken();
tokenRefreshInterval = setInterval(newToken, 1000 * 60 * 60);

app.get('/artists', (req, res) => {
    let error;
    getArtistsFromTopTracks().then(data => {
        spotifyApi.getArtists(data).then(artistsData => {
            res.status(200).send(artistsData.body.artists);
        }).catch(err => {
            error += err.message;
        });
    }).catch(err => {
        error += err.message;
        res.status(400).json({
            message: error
        });
    })
})

app.get('/artists/explore', (req, res) => {
    let selectedArtist = req.query.id;
    let ids = req.query.ids.split(',');
    getExploreArtists(selectedArtist, ids).then(data => {
        exploreArtists.push(data);
        res.status(200).json(data);
    }).catch(err => {
        res.status(400).json({
            message: err.message
        });
    })

})

app.get('/artists/search/:query', (req, res) => {
    spotifyApi.searchArtists(req.params.query, {
        limit: 5,
        offset: 0
    }).then(data => {
        res.status(200).send(data.body.artists);
    }).catch(err => {
        res.status(400).json({
            message: err.message
        });
    })
})

app.get('/artist/related/:id', (req, res) => {
    if (req.params.id != null) {
        spotifyApi.getArtistRelatedArtists(req.params.id).then(data => {
            if (data.statusCode == 200) {
                res.status(200).send(
                    data.body.artists.slice(0, 5)
                );
            }
        }).catch(err => {
            res.status(400).json({
                message: err.message
            });
        })
    } else
        res.status(400).json({
            message: "Erreur de syntaxe"
        });
})

app.get('/artist/preview/:id', (req, res) => {

    if (req.params.id != null) {
        spotifyApi.getArtistTopTracks(req.params.id, 'FR').then(data => {
            let tracks = data.body.tracks;
            var selectedTrack = null;
            var i = 0;
            while (selectedTrack == null) {
                var preview_url = tracks[i].preview_url;
                if (preview_url != null) {
                    selectedTrack = tracks[i]
                } else if (i == (tracks.length - 1) && preview_url == null) {
                    selectedTrack = 'none';
                }
                i++;
            }
            res.status(200).json(selectedTrack);
        }).catch(err => {
            res.status(400).json({
                message: err.message
            });
        })
    }
})


app.listen(8080, () => {
    console.log("Server listening")
})


async function getArtistsFromTopTracks() {
    let artistsIds = [];
    let tracks;
    try {
        tracks = await spotifyApi.getPlaylistTracks('37i9dQZEVXbNG2KDcFcKOF');
        tracks.body.items.forEach(item => {
            let artistId = item.track.album.artists[0].id;
            if (!artistsIds.includes(artistId))
                artistsIds.push(artistId);
        })
        return artistsIds;
    } catch (err) {
        return err;
    }
}

async function getLatLng(address) {
    let mapboxUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(address) + '.json?access_token=' + MAXBOX_ACCESS_TOKEN + '&autocomplete=true&limit=1';
    try {
        let latLng = await axios.get(mapboxUrl);
        if (latLng.data.features[0].bbox) {
            let random = getRandomLatLng(latLng.data.features[0].center[1], latLng.data.features[0].center[0]);
            console.log(random)
            return random;
        } else return latLng.data.features[0].center;
    } catch (err) {
        return err;
    }
}

async function getExploreArtists(id, ids) {
    let relatedArtists = [];
    try {
        let artistsData = await spotifyApi.getArtistRelatedArtists(id);
        relatedArtists = artistsData.body.artists.slice(0, 10);
        for (let artist of relatedArtists) {
            if (!exploreArtists.includes(artist) && !ids.includes(artist.id)) {
                artist.location = await getArtistLocation(artist);
                await wait(1000);
            } else
                relatedArtists.splice(relatedArtists.indexOf(artist), 1);
        }
        return relatedArtists;
    } catch (err) {
        console.log(err);
        return err;
    }
}

async function getArtistLocation(artist) {
    let name = artist.name;
    let mbUrl = 'https://musicbrainz.org/ws/2/artist?query=' + encodeURIComponent(name) + '&limit=5&fmt=json';
    console.log(mbUrl);
    try {
        let mbArtists = await axios.get(mbUrl);
        if (mbArtists.data.count == 1) {
            let latLng = await getLatLng(mbArtists.data.artists[0].area.name);
            return {
                name: mbArtists.data.artists[0].area.name,
                latLng: latLng
            };
        } else {
            for (let mbArtist of mbArtists.data.artists) {
                if (mbArtist.name.trim().toLowerCase() == name.toLowerCase()) {
                    let latLng = await getLatLng(mbArtist.area.name);
                    console.log(latLng);

                    return {
                        name: mbArtist.area.name,
                        latLng: latLng
                    };

                }
            }
        }
    } catch (err) {
        return err.message;
    }
}

function getRandomLatLng(lat, lng) {
    let min = Math.ceil(-300);
    let max = Math.floor(301);
    let random = Math.floor(Math.random() * (max - min)) + min;
    console.log(random);
    let newLat = lat + (random / 6378) * (180 / Math.PI);
    random = Math.floor(Math.random() * (max - min)) + min;
    console.log(random);
    let newLng = lng + (random / 6378) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
    return [newLng, newLat];
}

function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}