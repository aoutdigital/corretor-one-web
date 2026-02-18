export type PasswordStrength = "weak" | "medium" | "strong";

export type PasswordPolicyResult = {
  lengthOk: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  score: number;
  strength: PasswordStrength;
  isValid: boolean;
};

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  const value = password ?? "";
  const lengthOk = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasNumber = /[0-9]/.test(value);

  const score = Number(lengthOk) + Number(hasUppercase) + Number(hasNumber);

  let strength: PasswordStrength = "weak";
  if (score === 2) strength = "medium";
  if (score === 3) strength = "strong";

  return {
    lengthOk,
    hasUppercase,
    hasNumber,
    score,
    strength,
    isValid: score >= 2 && lengthOk && hasUppercase && hasNumber,
  };
}

export function passwordStrengthLabel(strength: PasswordStrength) {
  if (strength === "strong") return "Forte";
  if (strength === "medium") return "Média";
  return "Fraca";
}
