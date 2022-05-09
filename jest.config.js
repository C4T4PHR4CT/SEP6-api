module.exports = {
    roots: ["<rootDir>/src"],
    transform: {
        "^.+\\.ts?$": "ts-jest",
    },
    // Test all files in tests folder and all files in src with suffix .test.ts or .sepc.ts
    testRegex:
        "(^(?!.*(setup|teardown))/__tests__/.*|(\\.|/)(test|spec))\\.ts?$",
    moduleFileExtensions: ["ts", "js"],
    verbose: true,
    testEnvironment: "node",
    globalSetup: "<rootDir>/tests/jest.setup.ts",
    globalTeardown: "<rootDir>/tests/jest.teardown.ts",
    modulePaths: ["<rootDir>"],
};
