var app = require('express')();
var http = require('http').Server(app);
var path = require('path');
var express =require('express');
var bodyParser = require('body-parser');
var util = require('util');
var nodemailer = require('nodemailer');
var mustache = require('mustache');
var fs = require('fs');
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });
var session = require('client-sessions');
var crypto = require('crypto');

/*Fill this in with an actual email to make it work*/
var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: '',
    pass: ''
  }
});

var tr = require('./public/obj/tr.json'), wr = require('./public/obj/wr.json'),
  ed = require('./public/obj/ed.json'), home = require('./public/obj/home.json');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    cookieName: 'session',
    secret: 'randStr', //fix later
    duration: 30*60*1000,
    activeDuration: 30*60*1000
}));

var username = 'username';
var password = '81dc9bdb52d04dc20036dbd8313ed055';

function setObject(name, obj){
  if(name == 'tr'){
    tr = obj
  }
  else if(name == 'wr'){
    wr = obj;
  }
  else if(name == 'ed'){
    ed = obj;
  }
}

function finishUpdate(holder, prefix, isFeat, obj1, obj){
  holder.list.unshift(obj);
  var category = {};
  category.category = obj.category;
  if(holder.categories.length == 0){
    holder.categories.push(category);
  }
  else{
    var found = false;
    for(i = 0; i < holder.categories.length; i++){
      if(obj.category == holder.categories[i].category){
        found = true;
        break;
      }
    }
    if(found == false){
      holder.categories.push(category);
    }
  }
  //tr is written here.
  setObject(prefix, holder);
  fs.writeFile(__dirname + '/public/obj/' + prefix + '.json', JSON.stringify(holder), "utf8",function (err) {
    if (err){
      console.log(err);
    }
    if(isFeat){
       //just store whole home object
      var d1 = new Date();
      var t1 = d1.getTime();
      var path = 'files/' + t1 + obj1.name;
      fs.rename(obj1.path, './public/' + path, function(err1){
        if(err1){
          console.log(err1);
        }
        else{
          console.log('stuff happened');
          var oldPic;
          switch(prefix){
            case 'tr':
              oldPic = home.translating.pic;
              home.translating = obj;
              home.translating.pic = path;
              break;
            case 'wr':
              oldPic = home.writing.pic;
              home.writing = obj;
              home.writing.pic = path;
              break;
            case 'ed':
              oldPic = home.editing.pic;
              home.editing = obj;
              home.editing.pic = path;
              break;
            default:
              break;
          }
          fs.writeFile(__dirname + '/public/obj/home.json', JSON.stringify(home), function(req, res){
            console.log(JSON.stringify(home));
          });
          if(oldPic != ''){
            fs.unlink('./public/' + oldPic, function(err2){});
          }
        }
      });
    }
  });
}

app.get('(/|/deutsch|/russian|/serbian)', function(req,res){
  var page;
  switch(req.url){
    case '/':
      page = fs.readFileSync(__dirname + '/views/english/home.html', 'utf8');
      break;
    case '/deutsch':
      page = fs.readFileSync(__dirname + '/views/deutsch/home.html', 'utf8');
      break;
    case '/russian':
      page = fs.readFileSync(__dirname + '/views/russian/home.html', 'utf8');
      break;
    case '/serbian':
      page = fs.readFileSync(__dirname + '/views/serbian/home.html', 'utf8');
      break;
    default:
      console.log('Hello')
      break;
  }
  obj = {};
  obj.trLink = home.translating.path;
  obj.trPic = home.translating.pic;
  obj.wrLink = home.writing.path;
  obj.wrPic = home.writing.pic;
  obj.edLink = home.editing.path;
  obj.edPic = home.editing.pic;
  res.send(mustache.to_html(page, obj));
});

app.get('(/about|/about&deutsch|/about&russian|/about&serbian)', function(req, res){
  var lang;
  var arr = req.url.split('&');
  if(arr.length == 1){
    lang = 'english';
  }
  else{
    lang = arr[1];
  }
  res.sendFile(__dirname + '/views/' + lang + '/about.html');
});

app.get('((/translating|/writing|/editing)|(/translating|/writing|/editing)&(deutsch|russian|serbian|All|deutsch&All|russian&All|serbian&All))', function(req, res){
  var arr = req.url.split('&');
  var len = arr.length;
  var lang = '';
  var obj = {};
  if(len == 1){
    lang = 'english';
  }
  else if(len == 2){
    if(arr[1] == 'All'){
      lang = 'english';
    }
    else{
      lang = arr[1];
    }
  }
  else if(len == 3){
    lang = arr[1];
  }
  switch(arr[0]){
    case '/translating':
      obj = tr;
      break;
    case '/writing':
      obj = wr;
      break;
    case '/editing':
      obj = ed;
      break;
    default:
      break;
  }
  var page = fs.readFileSync(__dirname + '/views/' + lang + '/translating.html', 'utf8');
  for(i = 0; i < obj.categories.length; i++){
    if(obj.categories[i].category == "All"){
      obj.categories[i].select = "selected=\"selected\"";
    }
    else{
      obj.categories[i].select = "";
    }
  }
  res.send(mustache.to_html(page, obj));
});

app.get('(/translating|/writing|/editing)(&deutsch&|&russian&|&serbian&|&)*', function(req, res){
  var arr = decodeURI(req.url).split('&');
  var category;
  var lang = '';
  var obj = {}; holder = {};
  if(arr.length == 3){
    category = arr[2];
    lang = arr[1];
  }
  else{
    category = arr[1];
    lang = 'english';
  }
  switch(arr[0]){
    case '/translating':
      holder = tr;
      break;
    case '/writing':
      holder = wr;
      break;
    case '/editing':
      holder = ed;
      break;
    default:
      break;
  }
  obj.name = holder.name;
  obj.list = [];
  obj.categories = holder.categories; //needed so we can switch between them
  for(i = 0; i < obj.categories.length; i++){
    if(obj.categories[i].category == category){
      obj.categories[i].select = "selected";
    }
    else{
      obj.categories[i].select = "";
    }
  }
  for(i = 0; i < holder.list.length; i++){
    if(category == holder.list[i].category){
      obj.list.push(holder.list[i]);
    }
  }
  if(obj.list.length == 0){
    console.log("ERROR BAD URL" + req.url);
  }
  else{
    var page =   page = fs.readFileSync(__dirname + '/views/' + lang + '/translating.html', 'utf8');
    res.send(mustache.to_html(page, obj));
  }
});

app.get('/edit_(translating|writing|editing)', function(req,res){
  var obj = {};
  switch(req.url.split('_')[1]){
    case 'translating':
      obj = tr;
      break;
    case 'writing':
      obj = wr;
      break;
    case 'editing':
      obj = ed;
      break;
    default:
      break;
  }
  if(req.session && req.session.user == username){
    var page = fs.readFileSync(__dirname + '/views/english/edit_template.html', 'utf8');
    res.send(mustache.to_html(page, obj));
  }
  else {
    res.redirect('/login');
  }
});

app.post('/edit_(translating|writing|editing)', upload.fields([
  {
    name: 'file', maxCount: 1
  },
  {
    name: 'pic', maxCount: 1
  }
]), function(req, res){
  if(req.session && req.session.user == username){
    var obj = {};
    var holder = {};
    obj.title = req.body.title;
    obj.category = req.body.category;
    var prefix = '';
    switch(req.url.split('_')[1]){
      case 'translating':
        prefix = 'tr';
        holder = tr;
        break;
      case 'writing':
        prefix = 'wr';
        holder = wr;
        break;
      case 'editing':
        prefix = 'ed';
        holder = ed;
        break;
      default:
        break;
    }
    console.log(holder);
    obj.id = prefix + '_' + holder.count;
    holder.count++;
    if(req.body.input == 'fileInput'){
      var d = new Date();
      var t = d.getTime();
      var path = 'files/' + t + req.files.file[0].originalname;
      obj.path = path;
      obj.type = req.files.file[0].mimetype;
      fs.rename(req.files.file[0].path, './public/' + path, function(err){
        if (err){
          console.log(err);
        }
        else{
          if(req.body.isFeat == 'picInput' && typeof req.files.pic != 'undefined'){
            var stuff = {};
            stuff.name = req.files.pic[0].originalname;
            stuff.path = req.files.pic[0].path;
            finishUpdate(holder, prefix, true, stuff, obj);
          }
          else{
            finishUpdate(holder, prefix, false, null, obj);
          }
        }
      });
    }
    else{
      obj.path = req.body.link;
      obj.type = 'Link';
      if(req.body.isFeat == 'picInput'  && typeof req.files.pic != 'undefined'){
        var stuff = {};
        stuff.name = req.files.pic[0].originalname;
        stuff.path = req.files.pic[0].path;
        finishUpdate(holder, prefix, true, stuff, obj);
      }
      else{
        finishUpdate(holder, prefix, false, null, obj);
      }
    }
    res.redirect(req.url);
  }
});

app.get('(/tr|/wr|/ed)_[0-9]*', function(req, res){
  if(req.session && req.session.user == username){
    var find = req.url;
    var holder = {};
    var prefix = '';
    var feat = '';
    switch(req.url.split('_')[0]){
      case '/tr':
        prefix = 'tr';
        holder = tr;
        feat = home.translating;
        break;
      case '/wr':
        prefix = 'wr';
        holder = wr;
        feat = home.writing;
        break;
      case '/ed':
        prefix = 'ed';
        holder = ed;
        feat = home.editing;
        break;
      default:
        break;
    }

    for(i = 0; i < holder.list.length; i++){
      if(find == ('/' + holder.list[i].id)){
        if(holder.list[i].type != "Link"){
          fs.unlink("./public/" + holder.list[i].path, function(err){
            if(err){
              console.log(err);
            }
              //check if any other things in the same category exists
            var found = false;
            for(j = 0; j < holder.list.length; j++){
              if(holder.list[j].category == holder.list[i].category && i != j){
                found = true;
                break;
              }
            }
            if(found == false){
              for(k = 0; k < holder.categories.length; k++){
                if(holder.categories[k].category == holder.list[i].category){
                  holder.categories.splice(k, 1);
                }
              }
            }
            if('/' + feat.id == find){
              if(feat.pic != ''){
                fs.unlink('./public/' + feat.pic, function(error){});
              }
              switch(prefix){
                case 'tr':
                  home.translating.title = '';
                  home.translating.category = '';
                  home.translating.id = '';
                  home.translating.path = '';
                  home.translating.type = '';
                  home.translating.pic = '';
                  break;
                case 'wr':
                  home.writing.title = '';
                  home.writing.category = '';
                  home.writing.id = '';
                  home.writing.path = '';
                  home.writing.type = '';
                  home.writing.pic = '';
                  break;
                case 'ed':
                  home.editing.title = '';
                  home.editing.category = '';
                  home.editing.id = '';
                  home.editing.path = '';
                  home.editing.type = '';
                  home.editing.pic = '';
                  break;
                default:
                  break;
              }
              fs.writeFile(__dirname + '/public/obj/home.json',
               JSON.stringify(home), function(req, res){});
            }
            holder.list.splice(i, 1);
            setObject(prefix, holder);
            fs.writeFile(__dirname + '/public/obj/' + prefix + '.json',
            JSON.stringify(holder), "utf8", function (err1) {
              if (err1){
                console.log(err);
              }
              console.log("Wrote to file");
            });
            if(prefix == 'tr'){
              res.redirect('/edit_translating');
            }
            else if(prefix == 'wr'){
              res.redirect('/edit_writing');
            }
            else{
              res.redirect('/edit_editing');
            }
            console.log("Threw away old file");
          });
          break;
        }
        else{
          var found = false;
          for(j = 0; j < holder.list.length; j++){
            if(holder.list[j].category == holder.list[i].category && i != j){
              found = true;
              break;
            }
          }
          if(found == false){
            for(k = 0; k < holder.categories.length; k++){
              if(holder.categories[k].category == holder.list[i].category){
                holder.categories.splice(k, 1);
              }
            }
          }
          if('/' + feat.id == find){
            if(feat.pic != ''){
              fs.unlink('./public/' + feat.pic, function(error){});
            }

            fs.writeFile(__dirname + '/public/obj/home.json',
             JSON.stringify(home), function(req, res){});
          }
          holder.list.splice(i, 1);
          setObject(prefix, holder);
          fs.writeFile(__dirname + '/public/obj/' + prefix + '.json',
          JSON.stringify(holder), "utf8", function (err1) {
            if (err1){
              console.log(err);
            }
            console.log("Wrote to file");
          });
          if(prefix == 'tr'){
            res.redirect('/edit_translating');
          }
          else if(prefix == 'wr'){
            res.redirect('/edit_writing');
          }
          else{
            res.redirect('/edit_editing');
          }
          console.log("Threw away old file");
          break;
        }
      }
    }
  }
  else{
    res.redirect('/login');
  }
});

app.get('(/resume|/resume&deutsch|/resume&russian|/resume&serbian)', function(req, res){
  var arr = req.url.split('&');
  var lang = '';
  if(arr.length == 1){
    lang = 'english';
  }
  else{
    lang = arr[1];
  }
  res.sendFile(__dirname + '/views/' + lang + '/resume.html');
});

app.get('(/contact|/contact&deutsch|/contact&russian|/contact&serbian)', function(req, res){
  var arr = req.url.split('&');
  var lang = '';
  if(arr.length == 1){
    lang = 'english';
  }
  else{
    lang = arr[1];
  }
  res.sendFile(__dirname + '/views/' + lang + '/contact.html');
});

app.post('/contact', function(req, res){
  var name = req.body.first_name + " " + req.body.last_name;
  var fromStr =  name + " <" + req.body.email + ">";
  var mailOptions = {
      from: req.body.email,
      to: 'chrislciaba@gmail.com',
      subject: fromStr + ' sent you a message',
      text: req.body.message
  };
  console.log("stuff is happening");
    transporter.sendMail(mailOptions, function(error, info){
      if(error){
         console.log(error);
         res.sendFile(__dirname + '/views/english/notSent.html');
      }
      else{
        console.log('Message sent: ' + info.response);
        res.sendFile(__dirname + '/views/english/sent.html');
      }
  });
});

app.get('/login', function(req, res){
  res.sendFile(__dirname + '/views/english/login.html');
});

app.post('/login', function(req, res){
  var usr = req.body.username;
  var hashed = crypto.createHash('md5').update(req.body.password).digest('hex');

  if(hashed == password && usr == username){
    req.session.user = usr;
    res.redirect('/edit_translating');
  }
  else{
    res.redirect('/login');
  }
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
