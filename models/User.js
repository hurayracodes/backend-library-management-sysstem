import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "name is required"],
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [50, "Name cannot exceed 50 characters"],
  },
  email: {
    type: String,
    required: [true, "email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email",
    ],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false
  },
  role:{
    type:String,
    enum:["user","admin"],
    default:"user"
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
},
{
    timestamps: true
}
);

userSchema.pre('save', async function() {
    // password hashing logic will go here
    if(!this.isModified('password')){
        return;    
    }    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
})
// campaire password 
userSchema.methods.matchPassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
