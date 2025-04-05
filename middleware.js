const review = require("./models/review");

module.exports.isLoggedIn =(req,res,next)=>{
    if(!req.isAuthenticated())
  {
    req.session.redirectUrl = req.originalUrl;
    req.flash("error","you must be logged in to create listing!");
    return res.redirect("/login");
  }
  next();
}

module.exports.saveRedirectUrl =(req,res,next)=>{
  if(req.session.redirectUrl){
    res.locals.redirectUrl =req.session.redirectUrl;
  }
  next();
};

// module.exports.isReviewAuthor =async(req,res,next) =>{
//   let{id,reviewId} =req.params;
//   let review =await review.findById(reviewId);
//   if(!review.author.equals(res.locals.currUser._id))
//   {
//     req.flash("error","you are not the author of this reviews");
//     return res.redirect(`/listings/${id}`);
//   }
//   next();
// };