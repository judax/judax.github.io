// 'ident' and 'secret' should ideally be passed server-side for security purposes.
// If secureTokenRetrieval is true then you should remove these two values.

// Insecure method
FLOW.NET.xirsysConnect = {
    secureTokenRetrieval : false,
    data : {
        ident: "marshworks",
        secret: "67375256-a08a-11e6-ba22-2ec37b28bff0",
        domain: "flow.gl",
        application: "default",
        room: "default",
        secure: 1
    }
};

// Secure method
/*var xirsysConnect = {
 secureTokenRetrieval : true,
 server : '../getToken.php',
 data : {
 domain : '< www.yourdomain.com >',
 application : 'default',
 room : 'default',
 secure : 1
 }
 };*/

FLOW.NET.WebRtcConnect = function( experienceId) {
    FLOW.NET.webrtc = new $xirsys.simplewebrtc();
    FLOW.NET.webrtc.connect(
        xirsysConnect.data,
        {
            localVideoEl: 'localVideo', // the id/dom element to hold "our" video
            remoteVideosEl: 'remotesVideos', // the id/dom element to hold remote videos // Should this be 'remotes' instead?
            autoRequestMedia: true, // immediately ask for camera access
            debug: true,
            detectSpeakingEvents: false,
            autoAdjustMic: false
        },
        connectedCallback
    );

    function connectedCallback ($inst) {
        // grab the room from the URL
        //var room = location.search && location.search.split('?')[1];
        var room = experienceId;

        FLOW.NET.webrtc.prepareRoom(room);
        FLOW.NET.webrtc.on('readyToCall', function () {
            // you can name it anything
            if (room) FLOW.NET.webrtc.joinRoom(room);
        });

        function showVolume(el, volume) {
            /*if (!el) return;
             if (volume < -45) { // vary between -45 and -20
             el.style.height = '0px';
             } else if (volume > -20) {
             el.style.height = '100%';
             } else {
             el.style.height = '' + Math.floor((volume + 100) * 100 / 25 - 220) + '%';
             }*/
        }
        FLOW.NET.webrtc.on('channelMessage', function (peer, label, data) {
            if (data.type == 'volume') {
                showVolume(document.getElementById('volume_' + peer.id), data.volume);
            }
        });
        FLOW.NET.webrtc.on('videoAdded', function (video, peer) {
            console.log('video added', peer);
            var remotes = document.getElementById('remotes');
            if (remotes) {
                var d = document.createElement('div');
                d.className = 'videoContainer';
                d.id = 'container_' + FLOW.NET.webrtc.getDomId(peer);
                d.appendChild(video);
                var vol = document.createElement('div');
                vol.id = 'volume_' + peer.id;
                vol.className = 'volume_bar';
                video.onclick = function () {
                    video.style.width = video.videoWidth + 'px';
                    video.style.height = video.videoHeight + 'px';
                };
                d.appendChild(vol);
                remotes.appendChild(d);
            }
        });
        FLOW.NET.webrtc.on('videoRemoved', function (video, peer) {
            console.log('video removed ', peer);
            var remotes = document.getElementById('remotes');
            var el = document.getElementById('container_' + FLOW.NET.webrtc.getDomId(peer));
            if (remotes && el) {
                remotes.removeChild(el);
            }
        });
        FLOW.NET.webrtc.on('volumeChange', function (volume, treshold) {
            //console.log('own volume', volume);
            showVolume(document.getElementById('localVolume'), volume);
        });

        // Since we use this twice we put it here
        function setRoom(name) {

        }

        if (room) {
            console.log("setting room");

        } else {
            $('form').submit(function () {
                //var val = $('#sessionInput').val().toLowerCase().replace(/\s/g, '-').replace(/[^A-Za-z0-9_\-]/g, '');
                FLOW.NET.webrtc.createRoom(experienceId, function (err, name) {
                    var newUrl = location.pathname + '?' + name;
                    if (!err || err == "room_exists") {
                        //history.replaceState({foo: 'bar'}, null, newUrl);
                        //setRoom(name);
                        FLOW.NET.webrtc.joinRoom(name);
                    } else {
                        console.error(err);
                    }
                });
                return false;
            });
        }


    }
