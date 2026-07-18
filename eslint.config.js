// eslint.config.js
import LitertEslintRules from '@litert/eslint-plugin-rules';

export default [
    ...LitertEslintRules.configs.typescript,
    {
        files: [
            'src/lib/**/*.ts',
        ],
        languageOptions: {
            parserOptions: {
                project: 'tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        }
    },
];
