var client_id = '455f256a6ad94b7c8bf12d16c0b97846';
var client_secret = 'a20847f30e0542bab0974e144477070c';
var redirect = "https://jennifercruzcallejas.github.io/pomelo/songPick.html";

const AUTHORIZE = "https://accounts.spotify.com/authorize";
const token = "https://accounts.spotify.com/api/token";
const SEARCH = "https://api.spotify.com/v1/search";
const RECOMMENDATIONS = "https://api.spotify.com/v1/recommendations";

// redirect user to Spotify authorization page
function authorize() {
    let url = `${AUTHORIZE}?client_id=${client_id}&response_type=code&redirect_uri=${encodeURI(redirect)}&show_dialog=true&scope=user-read-private user-read-email user-read-playback-state user-top-read`;
    window.location.href = url;
}

// load the appropriate page based on the authorization status
function pageLoad() {
    if (window.location.search.length > 0) {
        handleRedirect();
    } else {
        checkAuth();
    }
}

// handle the redirect from Spotify after authorization
function handleRedirect() {
    let code = getCode();
    fetchToken(code).then(token => {
        window.localStorage.setItem('token', token);
        window.history.pushState("", "", "songPick.html");
        showSearchUI();
    });
}

// get the authorization code from the URL
function getCode() {
    let code = null;
    const queryString = window.location.search;
    if (queryString.length > 0) {
        const urlParams = new URLSearchParams(queryString);
        code = urlParams.get("code");
    }
    return code;
}

// fetch token using the authorization code
function fetchToken(code) {
    let body = `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURI(redirect)}&client_id=${client_id}&client_secret=${client_secret}`;
    return callAuthorizationApi(body);
}

// make API call for authorization
function callAuthorizationApi(body) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open("POST", token, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send(body);
        xhr.onload = function() {
            if (xhr.status == 200) {
                var data = JSON.parse(xhr.responseText);
                if (data.access_token) {
                    localStorage.setItem("access_token", data.access_token);
                }
                if (data.refresh_token) {
                    localStorage.setItem("refresh_token", data.refresh_token);
                }
                resolve(data.access_token);
            } else {
                console.error(xhr.responseText);
                alert(xhr.responseText);
                reject(xhr.responseText);
            }
        };
    });
}

// refresh the access token using the refresh token
function refreshAccessToken() {
    let refresh_token = localStorage.getItem("refresh_token");
    let body = `grant_type=refresh_token&refresh_token=${refresh_token}&client_id=${client_id}`;
    callAuthorizationApi(body);
}

// check if user is authorized
function checkAuth() {
    const access_token = localStorage.getItem("access_token");
    if (!access_token) {
        if (window.location.pathname !== '/home.html') {
            window.location.href = 'home.html';
        }
    } else {
        if (window.location.pathname === '/home.html') {
            window.location.href = 'songPick.html';
        } else if (window.location.pathname === '/songPick.html') {
            showSearchUI();
        }
    }
}

// display the search user interface
function showSearchUI() {
    document.getElementById("authSection").style.display = "none";
    document.getElementById("mainSection").style.display = "block";
}

// search for a song using Spotify API
function searchSong(query, callback) {
    if (query.trim() === "") return;
    callApi("GET", `${SEARCH}?q=${query}&type=track&limit=5`, null, callback);
}

// set song recommendations based on selected track IDs
function getRecommendations(trackIds, callback) {
    const validTrackIds = trackIds.filter(id => id);
    if (validTrackIds.length < 1 || validTrackIds.length > 4) {
        alert("Select 1 to 3 songs.");
        window.location.href = "songPick.html";
        return;
    }
    const url = `${RECOMMENDATIONS}?seed_tracks=${validTrackIds.join(',')}&limit=10`;
    callApi("GET", url, null, callback);
}

// call the API
function callApi(method, url, body, callback) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem("access_token"));
    xhr.send(body);
    xhr.onload = callback;
}

// handle the search response from Spotify API
function handleSearchResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        displaySearchResults(data);
    } else {
        console.error(this.responseText);
        alert(this.responseText);
    }
}

// display the search results in the UI
function displaySearchResults(data) {
    const resultsDiv = document.getElementById("searchResults");
    resultsDiv.innerHTML = "";
    if (data.tracks.items.length > 0) {
        resultsDiv.style.display = "block";
        data.tracks.items.forEach((item) => {
            let div = document.createElement("div");
            div.textContent = `${item.name} by ${item.artists[0].name}`;
            div.setAttribute("data-id", item.id);
            div.addEventListener("click", () => selectSong(item.id, item.name));
            resultsDiv.appendChild(div);
        });
    } else {
        resultsDiv.style.display = "none";
    }
}

// select a song from the search results
function selectSong(id, name) {
    const selectedSongs = document.getElementById("selectedSongs");
    if (selectedSongs.children.length < 4) {
        let div = document.createElement("div");
        div.textContent = name;
        div.setAttribute("data-id", id);
        div.classList.add('selected-song');
        selectedSongs.appendChild(div);
        if (selectedSongs.children.length === 4) {
            document.getElementById("songSearch").style.display = "none";
        }
    }
}

// submit the selected songs and store their IDs locally
function submitSongs() {
    const selectedSongs = document.getElementById("selectedSongs");
    const trackIds = Array.from(selectedSongs.children).map((div) => div.getAttribute("data-id")).filter(Boolean);
    
    if (trackIds.length >= 1 && trackIds.length <= 3) {
        localStorage.setItem("selectedTrackIds", JSON.stringify(trackIds));
        window.location.href = "musicRecs.html";
    } else {
        // show error image and message
        document.getElementById("noSongs").style.display = "block";
        document.getElementById("songBox").classList.add("show");
        document.getElementById("songError").classList.add("show");
        document.getElementById("songErrorMessage").classList.add("show");

        // hide the error after a delay
        setTimeout(() => {
            document.getElementById("noSongs").style.display = "none";
            document.getElementById("songBox").classList.remove("show");
            document.getElementById("songError").classList.remove("show");
            document.getElementById("songErrorMessage").classList.remove("show");
        }, 4000);
    }
}

document.addEventListener("DOMContentLoaded", pageLoad);

if (window.location.pathname.endsWith('musicRecs.html')) {
    const trackIds = JSON.parse(localStorage.getItem("selectedTrackIds") || "[]");
    getRecommendations(trackIds, handleRecommendationResponse);
}

// nav back to the song selection page
function goBack() {
    window.location.href = "songPick.html";
}

// cache for artist details to avoid redundant API calls
let artistCache = {};

// get artist details from Spotify API
function artistDetails(artistId, callback) {
    if (artistCache[artistId]) {
        callback(null, artistCache[artistId]);
        return;
    }

    callApi("GET", `https://api.spotify.com/v1/artists/${artistId}`, null, function() {
        if (this.status == 200) {
            var artistData = JSON.parse(this.responseText);
            artistCache[artistId] = artistData;
            callback(null, artistData);
        } else {
            callback(new Error(this.responseText));
        }
    });
}

// handle the recommendation response from Spotify API
function handleRecommendationResponse() {
    if (this.status == 200) {
        var data = JSON.parse(this.responseText);
        filterRecommendations(data.tracks);
    } else {
        console.error("Error status:", this.status);
        console.error("Error response:", this.responseText);
        alert(this.responseText);
    }
}

// filter the recommendations based on artist popularity
function filterRecommendations(tracks) {
    let filteredTracks = [];
    let remainingTracks = tracks.length;

    function processTrack(index) {
        if (index >= tracks.length) {
            displayRecommendations({ tracks: filteredTracks });
            return;
        }

        let track = tracks[index];
        artistDetails(track.artists[0].id, function(err, artistData) {
            if (!err && artistData.popularity < 70) { // change the popularity threshold as needed
                filteredTracks.push(track);
            } else if (err) {
                console.error("Error:", err);
            }
            remainingTracks--;
            if (remainingTracks === 0) {
                displayRecommendations({ tracks: filteredTracks });
            } else {
                setTimeout(() => processTrack(index + 1), 200); // introduce delay between requests
            }
        });
    }

    processTrack(0);
}

// display song recommendations
function displayRecommendations(data) {
    const recsDiv = document.getElementById("recommendations");
    recsDiv.innerHTML = "";
    data.tracks.forEach((track) => {
        let div = document.createElement("div");
        div.textContent = `${track.name} by ${track.artists.map(artist => artist.name).join(", ")}`;
        div.addEventListener("click", () => playSnippet(track.preview_url));
        recsDiv.appendChild(div);
    });
}

// play song snippet in a mini player
function playSnippet(url) {
    const errorContainer = document.getElementById("errorContainer");
    const errorBox = document.getElementById("errorBox");
    const error = document.getElementById("error");
    const miniPlayer = document.getElementById("miniPlayer");
    const audioPlayer = document.getElementById("audioPlayer");

    if (!url) {
        // hide the mini player and show the error image
        miniPlayer.style.display = "none";
        errorContainer.classList.add("show");
        errorBox.classList.add("show");
        error.classList.add("show");
        return;
    }

    // hide error image and show the mini player with the audio snippet
    errorContainer.classList.remove("show");
    errorBox.classList.remove("show");
    error.classList.remove("show");
    audioPlayer.src = url;
    audioPlayer.play();
    miniPlayer.style.display = "block";
}

// clear the selected songs
function clearSelectedSongs() {
    const selectedSongs = document.getElementById("selectedSongs");
    selectedSongs.innerHTML = "<h3>Song choices:</h3>";
    document.getElementById("songSearch").style.display = "block";
    document.getElementById("searchResults").innerHTML = "";
    document.getElementById("searchResults").style.display = "none";
    document.getElementById("songInput").value = "";
}
