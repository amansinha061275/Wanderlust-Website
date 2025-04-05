require('dotenv').config()
const express = require("express");
const app= express();
const mongoose = require("mongoose");
const Listing =require("./models/listing.js");
const path =require("path");
const methodOverride=require("method-override");
const ejsMate =require("ejs-mate");
const wrapAsync =require("./util/wrapAsync.js");
const ExpressError =require("./util/ExpressError");
const {listingSchema,reviewSchema} =require("./schema.js");
const Review =require("./models/review.js");
//const cookieParser =require("cookie-parser");
const session = require("express-session");
const MongoStore= require('connect-mongo');
const flash =require("connect-flash");
const passport=require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const {isLoggedIn, saveRedirectUrl, isReviewAuthor} =require("./middleware.js");
//const MONGO_URL ="mongodb://127.0.0.1:27017/wanderlust";


const dbUrl=process.env.Altas_url;


main().then(() =>{
    console.log("connected to DB");
}).catch((err) =>{
 console.log(err);
});

async function main(){
    await mongoose.connect(dbUrl);
}

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"/public")));


app.get("/",(req,res) =>{
  // console.dir(req.cookies);
   // res.send("hi i am root");
    res.render("listings/index.ejs");
 });
 
 const store =MongoStore.create({
  mongoUrl:dbUrl,
  crypto:{
    secret:process.env.secret1,
  },
  touchAfter:24*3600,
 })

 store.on("error",()=>{
  console.log("Error in mongo session store",err);
 })

 // use session
app.use(session({store, secret:process.env.secret1, resave:false,saveUninitialized:true,
   cookie :{
    expires:Date.now() + 7*24*60*60*1000,
    maxAge: 7*24*60*60*1000,
    httpOnly:true,
   },

}));

app.use(flash());
//hasing useed
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//middleware of flash message
app.use((req,res,next)=>{
  res.locals.success =req.flash("success");
  res.locals.error =req.flash("error");
  res.locals.currUser =req.user;
  next();
});

//hasing or salt
// app.get("/demouser", async (req,res) =>{
//    let fakeUser =new User({
//     email:"student@gmail.com",
//     username:"delta-student"
//    });
//    let registeredUser = await User.register(fakeUser,"helloworld");
//    res.send(registeredUser);
// });


// session
app.get("/register",(req,res)=>{
   let {name="anonymous"}= req.query;
   req.session.name=name;
   res.send(name);
});

app.get("/hello",(req,res) =>{
  res.send(`hello,${req.session.name}`);
})


// app.get("/reqcount",(req,res)=>{
//   if(req.session.count)
//   {
//     req.session.count ++;
//   }else{
//     req.session.count =1;
//   }
  
//   res.send(`you sent a request ${req.session.count} time`);
// });

// app.get("/test",(req,res)=>{
//   res.send("test successful");
// });



// app.use(cookieParser());
// //cookies
// app.get("/getcookies",(req,res)=>{
//   res.cookie("greet","hello");
//   res.send("send you some cookies");
// });




const validateListing =(req,res,next)=>{
  let {error} = listingSchema.validate(req.body);
  if(error)
  {
    throw new ExpressError(400,result.error);
  }else{
    next();
  }
};


const validatereview =(req,res,next)=>{
  let {error} = reviewSchema.validate(req.body);
  if(error)
  {
    throw new ExpressError(400,result.error);
  }else{
    next();
  }
};

app.get("/signup",(req,res)=>{
  res.render("users/signup.ejs");
});

app.post("/signup",wrapAsync(async(req,res) =>{
  try{
    let{username,email,password} =req.body;
    const newUser =new User({email,username});
    const registeredUser =await User.register(newUser,password);
    console.log(registeredUser);
    req.login(registeredUser,(err) =>{
       if(err)
       {
        return next(err);
       }
       req.flash("success","Welcome to Wanderlust");
       res.redirect("/listings");
    });
   
  }catch(e)
  {
    req.flash("error",e.message);
    res.redirect("/signup");
  }
})
);

app.get("/login",(req,res)=>{
   res.render("users/login.ejs");
});

app.post("/login",saveRedirectUrl,passport.authenticate("local",{failureRedirect : "/login",failureFlash : true,}),async(req,res)=>{
  req.flash("success","Welcome back to Wanderlust!");
  let redirectUrl = res.locals.redirectUrl || "/listings";
  res.redirect(redirectUrl);
});

app.get("/logout",(req,res,next)=>{
   req.logout((err)=>{
    if(err)
    {
      return next(err);
    }
    req.flash("success","you are logged out!");
    res.redirect("/listings");
   });
});

// index Route
app.get("/listings", wrapAsync(async(req,res) =>{
      const allListings = await Listing.find({});
      res.render("listings/index.ejs",{allListings});
    }));


//new Route
app.get("/listings/new",isLoggedIn,(req,res)=>{
  
  res.render("listings/new.ejs");
 });


//show Route
app.get("/listings/:id",  wrapAsync(async(req,res) =>{
let {id} =req.params;
const listing =await Listing.findById(id).populate({path:"reviews",populate:{path:"author",},});
if(!listing)
{
  req.flash("error","Listing you requested for does not exist!");
  res.redirect("/listings");
}
console.log(listing);
res.render("listings/show.ejs",{listing});
}));

//create Route
app.post("/listings",isLoggedIn,validateListing,wrapAsync(async(req,res,next)=>{
 
    const newListing =new Listing(req.body.listing);
    await newListing.save();
    req.flash("success","new Listing Created!");
    res.redirect("/listings");
  
}));

//Edit Route
app.get("/listings/:id/edit",isLoggedIn,wrapAsync(async(req,res) =>{
  let {id} =req.params;
const listing =await Listing.findById(id);
if(!listing)
{
  req.flash("error","Listing you requested for does not exist!");
  res.redirect("/listings");
}
res.render("listings/edit.ejs",{listing});
}));

//update Route
app.put("/listings/:id",isLoggedIn,validateListing, wrapAsync(async(req,res)=>{
  let {id} =req.params;
  await Listing.findByIdAndUpdate(id,{ ...req.body.listing});
  req.flash("success"," Listing Updated!");
  res.redirect("/listings");
}));

//delete Route
app.delete("/listings/:id",isLoggedIn,wrapAsync(async(req,res)=>{
  let {id} =req.params;
  let deletedListing =await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success"," Listing Deleted!");
  res.redirect("/listings");
}));

// Reviews
//Post Route
app.post("/listings/:id/reviews",isLoggedIn,validatereview,wrapAsync( async (req,res) =>{
   let listing =await Listing.findById(req.params.id);
   let newReview = new Review(req.body.review);
    newReview.author=req.user._id;
    
   listing.reviews.push(newReview);
    
   await newReview.save();
   await listing.save();

   req.flash("success","new Reviews Created!");
   console.log("new review saved");
   
   res.redirect(`/listings/${listing._id}`);
}));


//Delete Reviews

app.delete("/listings/:id/reviews/:reviewId",isLoggedIn,wrapAsync(async(req,res)=>{
  let {id,reviewId} =req.params;

  await Listing.findByIdAndUpdate(id,{$pull:{reviews:reviewId}});
  await Review.findByIdAndDelete(reviewId);
  req.flash("success"," Reviews Deleted!");
  res.redirect(`/listings/${id}`);
})
);





// app.get("/testLinsting",async (req,res) =>{
//   let sampleListing = new Listing({
//     title:"My New Villa",
//     description:"by the beach",
//     price:1200,
//     location:"calangue,goa",
//     country:"india",
//   });

//   await sampleListing.save();
//   let sampleListing1 = new Listing({
//     title:"My New car",
//     description:"by the car",
//     price:5000,
//     location:"patna",
//     country:"india",
//   });
  
//   await sampleListing1.save();
//   console.log("sample was saved");
//   res.send("successful teasting");
// });

app.all("*",(req,res,next) =>{
  next(new ExpressError(404,"page not Found"));
});

app.use((err,req,res,next)=>{
  let {statusCode=500,message="something went wrong"} =err;
  res.render("error.ejs",{message});
  //res.status(statusCode).send(message);
  
});



app.listen(8080,() => {
  console.log("server is listening to port 8080");
});
