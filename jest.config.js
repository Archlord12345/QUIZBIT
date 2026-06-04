module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '(jest-)?react-native' +
      '|@react-native(-community)?' +
      '|@react-navigation' +
      '|react-native-screens' +
      '|react-native-safe-area-context' +
      '|react-native-tcp-socket' +
      '|react-native-udp' +
      '|react-native-zeroconf' +
      '|@react-native-async-storage' +
      '|@react-native-documents' +
      '|@supabase' +
    ')/)',
  ],
  moduleNameMapper: {
    '^@react-native-documents/picker$':
      '<rootDir>/__mocks__/@react-native-documents/picker.js',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/__mocks__/@react-native-async-storage/async-storage.js',
    '^firebase/app$': '<rootDir>/__mocks__/firebaseApp.js',
    '^firebase/auth$': '<rootDir>/__mocks__/firebaseAuth.js',
    '^firebase/firestore$': '<rootDir>/__mocks__/firebaseFirestore.js',
    '^react-native-image-picker$':
      '<rootDir>/__mocks__/react-native-image-picker.js',
    '^react-native-audio-recorder-player$':
      '<rootDir>/__mocks__/react-native-audio-recorder-player.js',
  },
};
