const getFirestore = app => ({ app });
const collection = (...args) => ({ path: args });
const doc = (...args) => ({ path: args });
const setDoc = jest.fn();
const updateDoc = jest.fn();
const getDoc = jest.fn(async () => ({ exists: () => false }));
const addDoc = jest.fn(async () => ({ id: 'mock-doc-id' }));
const getDocs = jest.fn(async () => ({ docs: [] }));
const query = (...args) => ({ query: args });
const orderBy = (...args) => ({ orderBy: args });
const limit = value => ({ limit: value });
const Timestamp = { fromDate: date => ({ toDate: () => date }) };
module.exports = {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
};
