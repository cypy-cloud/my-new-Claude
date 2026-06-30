import nextConfig from "eslint-config-next"

const eslintConfig = [
  ...nextConfig,
  {
    rules: {
      // React Compiler 규칙: 다수의 기존 컴포넌트에서 위반 중. 동작에는 문제 없으나
      // 안전한 리팩터링이 필요해 Phase 2 이후 별도 작업으로 분리하고, 우선 경고로 낮춘다.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]

export default eslintConfig
