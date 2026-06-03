const getAuth = app => ({ app });
const createUserWithEmailAndPassword = jest.fn();
const signInWithEmailAndPassword = jest.fn();
const signOut = jest.fn();
const updateProfile = jest.fn();
module.exports = {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
};
