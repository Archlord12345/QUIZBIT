import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeView from './src/views/HomeView';
import QuizView from './src/views/QuizView';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#0052CC' }
        }}
      >
        <Stack.Screen name="Home" component={HomeView} />
        <Stack.Screen name="Quiz" component={QuizView} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
