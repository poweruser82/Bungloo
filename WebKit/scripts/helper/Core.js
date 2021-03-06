define([
    "jquery",
    "helper/APICalls",
    "lib/URI",
    "helper/HostApp",
    "lib/Markdown",
    "lib/Timeago",
    "lib/SingleDoubleClick"
],

function(jQuery, APICalls, URI, HostApp, Markdown) {

    function Core() {
        this.saveScrollTop = 0;
    }


    Core.prototype.show = function(container) {
        if (container) {
            $(container).show();
            document.body.scrollTop = this.saveScrollTop;
        }
    }

    Core.prototype.hide = function(container) {
        if (container && $(container).is(":visible")) {
            this.saveScrollTop = document.body.scrollTop;
            $(container).hide();
        }
    }

    Core.prototype.getTemplate = function() {

        if(this.template == "undefined") {
            return jQuery.extend(true, {}, this.template);
        }

        var a = document.createElement("a");

        var li = document.createElement("li");
        
        var item = document.createElement("div");
        item.className = "post";
        li.appendChild(item);

        var aside = document.createElement("aside");
        item.appendChild(aside);

        var ago = a.cloneNode();
        ago.className = "ago";
        aside.appendChild(ago);

        var reply_to = a.cloneNode();
        reply_to.className = "reply_to"
        reply_to.innerText = " ";
        reply_to.href = "#";
        aside.appendChild(reply_to);

        var repost = a.cloneNode();
        repost.className = "repost";
        repost.innerText = " ";
        repost.href = "#";
        aside.appendChild(repost);

        var remove = a.cloneNode();
        remove.className = "remove";
        remove.innerText = " ";
        remove.href = "#";
        aside.appendChild(remove);

        var image = document.createElement("img");
        image.className = "image";
        image.src = "img/default-avatar.png";
        image.onmousedown = function(e) { e.preventDefault(); };
        image.onerror = function() { this.src = 'img/default-avatar.png' };
        item.appendChild(image);

        var image_username = a.cloneNode();
        image.appendChild(image_username);

        var data = document.createElement("div");
        data.className = "data";
        item.appendChild(data);

        var head = document.createElement("h1");
        data.appendChild(head);

        var username = a.cloneNode();
        head.appendChild(username);

        var space = document.createTextNode(" ");
        head.appendChild(space);

        var geo = document.createElement("a");
        geo.style.display = "none";
        head.appendChild(geo);

        head.appendChild(space.cloneNode());

        var is_private = document.createElement("span")
        is_private.className = "is_private";
        is_private.style.display = "none";
        is_private.innerHTML = "P";
        is_private.title = "Private";
        head.appendChild(is_private);

        head.appendChild(space.cloneNode());

        var pin = document.createElement("img");
        pin.src = "img/pin.png";
        pin.alt = "Map link";
        geo.appendChild(pin);

        head.appendChild(space.cloneNode());

        var reposted_by = document.createElement("span");
        reposted_by.className = "reposted_by";
        reposted_by.style.display = "none";

        var reposted_count = document.createElement("span");
        reposted_count.innerText = "by 0 people";
        reposted_by.appendChild(reposted_count)

        var reposted_list = document.createElement("ul");
        reposted_list.className = "reposted_list";
        reposted_by.appendChild(reposted_list);

        head.appendChild(reposted_by)

        var message = document.createElement("div");
        message.className = "message";
        data.appendChild(message);

        var images = document.createElement("p")
        images.className = "images";
        data.appendChild(images);

        var from = message.cloneNode();
        from.className = "from";
        data.appendChild(from);

        var from_text = document.createTextNode("from ");
        from.appendChild(from_text)

        var source = document.createElement("a");
        source.className = "source";
        from.appendChild(source)

        this.template = {
            li: li,
            item: item,
            reply_to: reply_to,
            is_private: is_private,
            image: image,
            username: username,
            repost: repost,
            reposted_by: reposted_by,
            message: message,
            ago: ago,
            source: source,
            geo: geo,
            images: images,
            remove: remove
        }

        return jQuery.extend(true, {}, this.template);;
    }

    Core.prototype.getStatusDOMElement = function(status, refs) {

        var _this = this;

        var template = this.getTemplate();

        template.li.id = "post-" + status.id + "-" + this.action;
        template.li.status = status;

        if (HostApp.stringForKey("entity") == status.entity && typeof status.__repost == "undefined") {
            template.remove.onclick = function() {
                _this.remove(status.id);
                return false;
            }
        } else if (typeof status.__repost != "undefined" && HostApp.stringForKey("entity") == status.__repost.entity) {
            template.remove.onclick = function() {
                _this.remove(status.__repost.id, null, "repost");
                return false;
            }
        } else {
            template.remove.style.display = "none";
        }

        if (HostApp.stringForKey("entity") == status.entity) {
            template.li.className += " own";
        }

        template.reply_to.onclick = function() {

            var mentions = [];
            var status_mentions = [];
            if(status.mentions) status_mentions = status.mentions.slice(0);

            if (typeof status.__repost != "undefined") {
                status_mentions.push({entity:status.__repost.entity});
            }
            for (var i = 0; i < status_mentions.length; i++) {
                var mention = status_mentions[i];
                if(mention.entity != HostApp.stringForKey("entity"))
                    mentions.push(mention);
            }

            _this.replyTo(status);
            return false;
        }

        template.repost.onclick = function() {
            $(template.repost).hide();
            _this.repost(status);
            return false;
        }

        if(bungloo.cache.profiles[status.entity] && bungloo.cache.profiles[status.entity].name) template.username.innerText = bungloo.cache.profiles[status.entity].name;
        else template.username.innerText = status.entity;
        template.username.href = status.entity;
        template.username.title = status.entity;
        template.username.onclick = function() {
            HostApp.showProfileForEntity(status.entity);
            return false;
        }

        if(bungloo.cache.profiles[status.entity] && bungloo.cache.profiles[status.entity].avatar_digest) {
            template.image.src = HostApp.serverUrl("attachment").replace(/\{entity\}/, encodeURIComponent(status.entity)).replace(/\{digest\}/, bungloo.cache.profiles[status.entity].avatar_digest);
        }

        template.image.onclick = template.username.onclick;


        if (status && status.permissions && !status.permissions.public) {
            template.is_private.style.display = '';
        }

        var text = "";

        if (status.type == "https://tent.io/types/post/photo/v0.1.0") { // FIXME
            text = status.content.caption;
        } else {
            if (status.content && status.content.text) {
                text = status.content.text;
            }
        }

        this.parseForMedia(text, template.images);

        var entities = [status.entity];
        if (status.mentions) {
            status.mentions.map(function (mention) {
                entities.push(mention.entity)
            });
        }

        template.message.innerHTML = this.replaceURLWithHTMLLinks(text, entities, template.message);
        this.afterChangingTextinMessageHTML(template.message)

        if(status.refs) {
            for (var i = 0; i < status.refs.length; i++) {
                var ref = status.refs[i];
                if(ref.type == "https://tent.io/types/photo/v0#") {
                    if(refs) {
                        for (var j = 0; j < refs.length; j++) {
                            var r = refs[j];
                            if(ref.post == r.id) {
                                for (var k = 0; k < r.attachments.length; k++) {
                                    var attachment = r.attachments[k];
                                    var a = document.createElement("a");
                                    var img = document.createElement("img");
                                    img.src = HostApp.serverUrl("attachment")
                                                .replace(/\{entity\}/, encodeURIComponent(r.entity))
                                                .replace(/\{digest\}/, attachment.digest);
                                    a.appendChild(img);
                                    a.href = img.src;
                                    template.images.appendChild(a);
                                }
                            }
                        }
                    }
                }
            }            
        }

        this.findMentions(template.message, status.mentions);

/*
        for (var i = 0; i < status.mentions.length; i++) {
            var mention = status.mentions[i];
            if (mention.entity == HostApp.stringForKey("entity")) {
                this.template.item.className = "mentioned";
                break;
            }
        }
*/
        var published_at = typeof status.__repost == "undefined" ? status.version.published_at : status.__repost.published_at;
        var time = document.createElement("abbr");
        time.innerText = this.ISODateString(new Date(published_at));
        time.title = time.innerText;
        time.className = "timeago";
        jQuery(time).timeago();
        template.ago.appendChild(time);

        template.ago.href = "#"
        
        $(template.ago).single_double_click(function () {
            HostApp.showConversation(status.id, status.entity);
            return false;
        }, function () {
            HostApp.showConversationViewForPostIdandEntity(status.id, status.entity);
            return false;
        });

        if (status.content && status.content.location) {
            var lat = status.content.location.latitude;
            var lng = status.content.location.longitude;

            if (typeof lat != "undefined" && typeof lng != "undefined") {

                var href = this.mapHref(lat, lng);
                template.geo.href = href;
                template.geo.style.display = "";

                this.addMap(lat, lng, template.images);                
            }

        }

        if (typeof status.__repost != "undefined") {
            template.source.href = status.__repost.app.url;
            template.source.innerHTML = status.__repost.app.name;
            template.source.title = status.__repost.app.url;
        } else {
            if(status.app) {
                template.source.href = status.app.url;
                template.source.innerHTML = status.app.name;
                template.source.title = status.app.url;
            }
        }

        return template.li;
    }


    Core.prototype.getRepost = function(repost, before_node, append) {

        var post = document.getElementById("post-" + repost.refs[0].post + "-" + this.action);

        if (post) {

            if (repost.entity == HostApp.stringForKey("entity")) {
                var remove = $(post).find(".remove");
                remove.show();

                var _this = this;
                remove.get(0).onclick = function(e) {
                    var callback = function() {

                        // make remove button to remove post if it is the entities
                        if(post.status.entity == HostApp.stringForKey("entity")) {
                            remove.get(0).onclick = function(e) {
                                _this.remove(post.status.id);
                                return false;
                            }
                        } else {
                            remove.hide();
                        }

                        $(post).find(".repost").show();
                    }

                    _this.remove(repost.id, callback, "repost");
                    return false;
                };
            }

            var reposted_count = $(post).find(".reposted_by ul li").length + 1;

            var people_person = reposted_count == 1 ? "person" : "people";

            $(post).find(".reposted_by span").html("by " + reposted_count + " " + people_person);
            $(post).find(".reposted_by").show();

            var li = $("<li/>");
            li.attr("id", "post-" + repost.id + "-" + this.action)
            var a = $("<a/>");

            a.attr("href", repost.entity);
            a.attr("title", repost.entity);
            a.html(repost.entity);
            li.append(a);
            $(post).find(".reposted_by ul").append(li);


            a.click(function(e) {
                HostApp.showProfileForEntity(repost.entity);
                return false;
            });

            var name = bungloo.cache.profiles[repost.entity] ? bungloo.cache.profiles[repost.entity].name : repost.entity;
            a.html(name);

        } else {

            var entity = repost.refs[0].entity ? repost.refs[0].entity : HostApp.stringForKey("entity");
            var id = repost.refs[0].post;
            
            var url = HostApp.serverUrl("post")
                .replace(/\{entity\}/, encodeURIComponent(entity))
                .replace(/\{post\}/, id)
                + "?profiles=entity";

            var _this = this;

            APICalls.get(url, { callback: function(resp) {

                if (resp.status >= 200 && resp.status < 300 && before_node) {
                    var _statuses = JSON.parse(resp.responseText);

                    for (var entity in _statuses.profiles) {
                        if (_statuses.profiles[entity] != null) {
                            bungloo.cache.profiles[entity] = _statuses.profiles[entity];
                        } else {
                            bungloo.cache.profiles[entity] = {};
                        }
                    }

                    var status = _statuses.post;

                    status.__repost = repost;
                    var li = _this.getStatusDOMElement(status);
                    if(!document.getElementById(li.id)) before_node.parentNode.insertBefore(li, before_node);
                    _this.getRepost(repost, before_node); // call this recursive because we now have the repost
                }


            }});

            /*

            var _this = this;
            var callback = function(resp) {
                if (resp.status >= 200 && resp.status < 300 && before_node) {
                    var status = JSON.parse(resp.responseText);
                    status.__repost = repost;
                    var li = _this.getStatusDOMElement(status);
                    if(!document.getElementById(li.id)) before_node.parentNode.insertBefore(li, before_node);
                    _this.getRepost(repost, before_node); // call this recursive because we now have the repost
                }
            }

            APICalls.findProfileURL(repost.content.entity, function(profile_url) {
                if (profile_url) {

                    APICalls.http_call(profile_url, "GET", function(resp) {

                        var profile = JSON.parse(resp.responseText);
                        var server = profile["https://tent.io/types/info/core/v0.1.0"].servers[0];
                        APICalls.http_call(URI(server + "/posts/" + repost.content.id).toString(), "GET", callback, null, false);

                    }, null, false); // do not send auth-headers
                }
            });*/
        }
    }

    Core.prototype.repost = function(status, callback) {
        var type = status.type;
        var id = status.id;
        var entity = status.entity;
        var url = HostApp.serverUrl("new_post");
        var data = {
            type: "https://tent.io/types/repost/v0#" + type.split("#")[0],
            refs: [
                {
                    post: id,
                    entity: entity
                }
            ],
            mentions: [
                {
                    post: id,
                    type: type,
                    entity: entity
                }

            ]
        }

        APICalls.post(url, JSON.stringify(data), {
            content_type: data.type,
            accept: 'application/vnd.tent.post.v0+json; type="https://tent.io/types/repost/v0#"',
            callback: function(resp) {
                if (resp.status >= 200 < 300) {
                    controller.getNewData();
                    if(callback) callback(resp);
                } else {
                    debug(resp)
                }
            }

        })

        /*
        var url = URI(APICalls.mkApiRootPath("/posts"));

        var data = {
            "type": "https://tent.io/types/post/repost/v0.1.0",
            "published_at": parseInt(new Date().getTime() / 1000, 10),
            "permissions": {
                "public": true
            },
            "content": {
                "entity": entity,
                "id": id
            },
            "mentions": [
                {
                    "entity": entity,
                    "post": id
                }
            ]
        };

        var _this = this;
        var new_callback = function(resp) {
            if (callback) callback(resp);
            _this.highlight(id);
        }

        APICalls.http_call(url.toString(), "POST", new_callback, JSON.stringify(data));*/
    }

    Core.prototype.remove = function(id, callback, type) {
        type = type || "post";
        if (confirm("Really delete this " + type + "?")) {

            var entity = HostApp.stringForKey("entity");
            var url = HostApp.serverUrl("post")
                .replace(/\{entity\}/, encodeURIComponent(entity))
                .replace(/\{post\}/, id);

            APICalls.delete(url, { callback: callback });
        }
    }


    Core.prototype.logout = function() {

        if(this.body) this.body.innerHTML = "";
    }


    // Helper functions

    Core.prototype.replaceShortened = function(url, message_node) {

        var api = "http://api.bitly.com";
        if(url.startsWith("http://j.mp/")) {
           api = "http://api.j.mp";
        }

        var api_url = api + "/v3/expand?format=json&apiKey=R_4fc2a1aa461d076556016390fa6400f6&login=twittia&shortUrl=" + url; // FIXME: new api key

        jQuery.ajax({
            url: api_url,
            success: function(data) {
                var new_url = data.data.expand[0].long_url;
                if (new_url) {
                    var regex = new RegExp(url, "g");
                    message_node.innerHTML = message_node.innerHTML.replace(regex, new_url);
                }
            },
            error:function (xhr, ajaxOptions, thrownError) {
                console.error(xhr.status);
                console.error(thrownError);
            }
        });
    }

    Core.prototype.findMentions = function(node, mentions) {

        var text = node.innerHTML;
        var mentions_in_text = [];

        var res = text.match(/(\^[\w:/.-]+(?:[\w]))/ig);

        if (res) {
            for (var i = 0; i < res.length; i++) {
                var name = res[i];
                var e = name.substring(1);
                if (e.substring(0,7) != "http://" && e.substring(0,8) != "https://") {
                  e = "https://" + e;
                }
                if(mentions) {
                    for (var j = 0; j < mentions.length; j++) {
                        var m = mentions[j];
                        if(m && m.entity && m.entity.startsWith(e)) {
                            mentions_in_text.push({
                                entity: m.entity,
                                text: name
                            });
                        }
                    }
                }
            }
        }

        var _this = this;
        for (var i = 0; i < mentions_in_text.length; i++) {
            var mention = mentions_in_text[i];

            (function(mention) { // need this closure

                var profile = function(profile) {

                    var basic = profile["https://tent.io/types/info/basic/v0.1.0"];

                    if (profile) {
                        var name = mention.text;
                        if (basic && basic.name) {
                            name = basic.name;
                        }

                        var new_text = node.innerHTML.replace(
                            mention.text,
                            "<a href='" + mention.entity + "' class='name' title='" + mention.entity + "'>"
                            + name
                            + "</a>"
                        );

                        node.innerHTML = new_text;
                        _this.afterChangingTextinMessageHTML(node);

                        // adding comma between names when there is only
                        // a space in between.
                        var names = $(node).find("a.name");
                        names.each(function(i) {
                            if(this.nextSibling && $(this.nextSibling.nextSibling).hasClass("name") && this.nextSibling.nodeValue == " " ) {
                                $(this).after(",")
                            }
                        });
                    }
                }

                APICalls.findProfileURL(mention.entity, function(profile_url) {
                    if (profile_url) {
                        APICalls.http_call(profile_url, "GET", function(resp) {
                            if (resp.status >= 200 && resp.status < 400) {
                                var p = JSON.parse(resp.responseText);
                                _this.cache.profiles.setItem(mention.entity, p);
                                profile(p)
                            }
                        }, null, false); // do not send auth-headers
                    }
                });

            })(mention);
        }
    }

    Core.prototype.parseMentions = function(text, post_id, entity) {

        var mentions = [];

        if (post_id && entity && post_id != "(null)" && entity != "(null)") {
            mentions.push({
                post: post_id,
                entity: entity
            })
        }

        var res = text.match(/(\^[\w:/]+\.[\w:/.-]+(?:[\w]))/ig);

        if (res) {
            for (var i = 0; i < res.length; i++) {
                var e = res[i].substring(1);
                if (e.substring(0,7) != "http://" && e.substring(0,8) != "https://") {
                  e = "https://" + e;
                }
                if (e != entity) {
                    mentions.push({entity:e});
                }
            }
        }

        return mentions;
    }

    Core.prototype.ISODateString = function(d){

      function pad(n){return n<10 ? '0'+n : n}

      return d.getUTCFullYear()+'-'
          + pad(d.getUTCMonth()+1)+'-'
          + pad(d.getUTCDate())+'T'
          + pad(d.getUTCHours())+':'
          + pad(d.getUTCMinutes())+':'
          + pad(d.getUTCSeconds())+'Z'
    }

    Core.prototype.replaceURLWithHTMLLinks = function(text, entities, message_node) {
        return Markdown.toHTML( text, 'Tent', { footnotes: entities } )
                .replace(/\^<a/g, "<a"); // hack to remove the ^ before tent names
    }

    Core.prototype.parseForMedia = function(text, images) {

        var words = text.split(/\s/);

        for (var i = 0; i < words.length; i++) {

            var word = words[i];

            if (word.startsWith("http")) {
                
                var src = null;
                var type = "img";

                if (word.startsWith("http") && (word.endsWith(".jpg") || word.endsWith(".jpeg") || word.endsWith(".gif") || word.endsWith(".png"))) {

                    src = word;

                } else if(word.startsWith("http://youtube.com/") || word.startsWith("http://www.youtube.com/") || word.startsWith("https://youtube.com/") || word.startsWith("https://www.youtube.com/")) {
                    
                    var v = APICalls.getUrlVars(word)["v"];
                    this.addYouTube(v, images);

                } else if (word.startsWith("http://youtu.be/") || word.startsWith("https://youtu.be/")) {

                    var v = word.replace(/https?:\/\/youtu\.be\//, "");
                    this.addYouTube(v, images);

                } else if (word.startsWith("http://soundcloud.com/") || word.startsWith("http://www.soundcloud.com/") || word.startsWith("https://soundcloud.com/") || word.startsWith("https://www.soundcloud.com//")) {

                    this.addSoundCloud(word, images);
                
                } else if (word.startsWith("http://twitpic.com/") || word.startsWith("https://twitpic.com/")) {

                    src = "http://twitpic.com/show/thumb/" + word.substring("http://twitpic.com/".length);

                } else if (word.startsWith("http://yfrog") || word.startsWith("https://yfrog")) {

                    src = word + ":medium"
                    
                } else if (word.startsWith("http://instagr.am/p/") || word.startsWith("http://instagram.com/p/") || word.startsWith("https://instagr.am/p/") || word.startsWith("https://instagram.com/p/")) {
                    
                    src = word + "media?size=l";

                } else if (word.startsWith("http://cl.ly/") || word.startsWith("https://cl.ly/")) {

                    var v = word.replace(/https?:\/\/cl\.ly\//, "");
                    src = "http://thumbs.cl.ly/" + v;

                } else if (word.startsWith("http://d.pr/i/") || word.startsWith("https://d.pr/i/")) {

                    src = word + "+";

                } else if (word.startsWith("http://vimeo.com/") || word.startsWith("http://vimeo.com/")) {

                    var video_id = word.replace(/https?:\/\/vimeo\.com\//, "");
                    this.addVimeo(video_id, images);
                }

                if (src) {
                    var a = document.createElement("a");
                    a.href = word;
                    a.className = type;
                    var img = document.createElement("img");
                    img.src = src;
                    a.appendChild(img);
                    images.appendChild(a);
                }
            }
        }
    }

    Core.prototype.replyTo = function(status) {
        HostApp.openNewMessageWidow(status);
    }

    Core.prototype.postDeleted = function(post_id, entity) {
        var li = document.getElementById("post-" + post_id + "-" + this.action);
        if (li) {
            if (li.parentNode == this.body) {
                this.body.removeChild(li);
            } else if($(li).parent().hasClass("reposted_list")) { // if it is a repost we are removing
                var ul = $(li).parent();
                ul.get(0).removeChild(li);
                if (ul.find("li").length == 0) {
                    ul.parent(".reposted_by").hide();
                } else {
                    var reposted_by = ul.parent(".reposted_by");
                    var reposted_count = reposted_by.find("ul li").length;

                    var people_person = reposted_count == 1 ? "person" : "people";

                    reposted_by.find("span").html("by " + reposted_count + " " + people_person);
                }
            }
        }
    };

    Core.prototype.highlight = function(id) {

        $("#post-" + id).addClass("highlighteffect");
        setTimeout(function() {
            $("#post-" + id).removeClass("highlighteffect");
            $("#post-" + id).addClass("highlighteffect-after");
            setTimeout(function() {
                $("#post-" + id).removeClass("highlighteffect-after");
            }, 1000);
        }, 4000);

    }

    Core.prototype.mapHref = function(lat, lng) {
        return "http://www.openstreetmap.org/?mlat=" + lat.toString() + "&mlon=" + lng.toString() + "&zoom=12";
    }

    Core.prototype.mapSrc = function(lat, lng) {
        var width = $("div:visible div.message").width();
        return "http://staticmap.openstreetmap.de/staticmap.php?center=" + lat.toString() + "," + lng.toString() + "&zoom=3&size=" + width + "x75&markers=" + lat + "," + lng + ",red-pushpin";
    }

    Core.prototype.addMap = function(lat, lng, images) {
        var self = this;
        setTimeout(function(){
                   var a = document.createElement("a");
                   a.className = "map";
                   a.href = self.mapHref(lat, lng);
                   var img = document.createElement("img");
                   img.src = self.mapSrc(lat, lng);
                   a.appendChild(img);
                   images.appendChild(a);
        }, 200);
    }

    Core.prototype.addYouTube = function(id, images) {
        var a = $("<a>", {
            href: "http://youtu.be/" + id,
            class: "youtube"
        });

        var img = $("<img>", {src: "http://img.youtube.com/vi/" + id + "/0.jpg"});
        var h = 200;
        img.load(function() {
            h = img.height();
        });

        a.click(function() {
            var iframe = $('<iframe />', {
                class: "youtube",
                type: "text/html",
                width: "100%",
                height: h,
                frameborder: 0,
                src: 'http://www.youtube.com/embed/' + id + '?rel=0&showsearch=0&version=3&modestbranding=1&autoplay=1'
            })
            a.replaceWith(iframe);
            return false;
        })

        img.appendTo(a);
        a.appendTo(images);
    }

    Core.prototype.addVimeo = function(id, images) {
        $(images).append('<iframe class="vimeo" src="http://player.vimeo.com/video/' + id + '?byline=0&amp;portrait=0" width="100%" height="200" frameborder="0" webkitAllowFullScreen allowFullScreen />');
    }

    Core.prototype.addSoundCloud = function(url, images) {
        $(images).append('<iframe class="soundcloud" src="https://w.soundcloud.com/player/?url=' + url + '" width="100%" height="166" scrolling="no" frameborder="no"></iframe>');
    }

    Core.prototype.afterChangingTextinMessageHTML = function(message_node) {                
        // adding show search on click hash
        /*
        $(message_node).find("a.hash").click(function(e) {

            if(bungloo.search) bungloo.search.searchFor(e.target.innerHTML);
            return false;
        });
        */
        // adding show profile on click
        /*
        $(message_node).find("a.name").click(function(e) {
            HostApp.showProfileForEntity(e.target.title);
            return false;
        });*/
    }


    return Core;

});