// Reanimated needs its native worklets runtime, which Jest does not have; its own mock leaves out
// `useReducedMotion`, which the HITL pager reads.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }))
