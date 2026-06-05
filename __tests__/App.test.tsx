/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/utils/networkHealth', () => ({
  checkApiHealth: jest.fn().mockResolvedValue({
    ok: true,
    url: 'https://quizbit-admin.vercel.app',
    mode: 'remote',
    message: 'API QuizBit accessible.',
  }),
}));

jest.mock('../src/controllers/AuthController', () => ({
  __esModule: true,
  default: {
    restoreSession: jest.fn().mockResolvedValue(null),
    setCurrentAccount: jest.fn().mockResolvedValue(undefined),
    login: jest.fn(),
    register: jest.fn(),
  },
}));

jest.mock('../src/utils/appPermissions', () => ({
  requestAppPermissions: jest.fn().mockResolvedValue(undefined),
}));

const flushPromises = () =>
  new Promise<void>(resolve => {
    setImmediate(resolve);
  });

test('renders correctly', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
    await flushPromises();
    await flushPromises();
  });

  await ReactTestRenderer.act(async () => {
    renderer.unmount();
  });
});
