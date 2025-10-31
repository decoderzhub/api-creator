export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
}

export const validatePasswordNIST = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  let strengthScore = 0;

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    strengthScore += 1;
  }

  if (password.length >= 12) {
    strengthScore += 1;
  }

  if (password.length >= 16) {
    strengthScore += 1;
  }

  if (/[a-z]/.test(password)) {
    strengthScore += 1;
  } else {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (/[A-Z]/.test(password)) {
    strengthScore += 1;
  } else {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (/[0-9]/.test(password)) {
    strengthScore += 1;
  } else {
    errors.push('Password must contain at least one number');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    strengthScore += 1;
  } else {
    errors.push('Password must contain at least one special character');
  }

  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890'
  ];

  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password is too common');
    strengthScore = Math.max(0, strengthScore - 2);
  }

  const repeatedChars = /(.)\1{2,}/.test(password);
  if (repeatedChars) {
    errors.push('Password contains too many repeated characters');
    strengthScore = Math.max(0, strengthScore - 1);
  }

  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (strengthScore <= 3) {
    strength = 'weak';
  } else if (strengthScore <= 5) {
    strength = 'fair';
  } else if (strengthScore <= 6) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0 && strengthScore >= 4,
    errors,
    strength
  };
};

export const checkPasswordPwned = async (password: string): Promise<{ isPwned: boolean; count: number }> => {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);

    if (!response.ok) {
      console.error('Failed to check password against HIBP');
      return { isPwned: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix === suffix) {
        return { isPwned: true, count: parseInt(count, 10) };
      }
    }

    return { isPwned: false, count: 0 };
  } catch (error) {
    console.error('Error checking password:', error);
    return { isPwned: false, count: 0 };
  }
};

export const getStrengthColor = (strength: string): string => {
  switch (strength) {
    case 'weak':
      return 'bg-red-500';
    case 'fair':
      return 'bg-yellow-500';
    case 'good':
      return 'bg-blue-500';
    case 'strong':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

export const getStrengthText = (strength: string): string => {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'fair':
      return 'Fair';
    case 'good':
      return 'Good';
    case 'strong':
      return 'Strong';
    default:
      return 'Unknown';
  }
};
