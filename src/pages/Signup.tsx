import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { validatePasswordNIST, checkPasswordPwned, getStrengthColor, getStrengthText } from '../lib/passwordValidation';

export const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<any>(null);
  const [isPwned, setIsPwned] = useState(false);
  const [checkingPwned, setCheckingPwned] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (password) {
      const validation = validatePasswordNIST(password);
      setPasswordValidation(validation);

      const checkPwned = async () => {
        setCheckingPwned(true);
        const result = await checkPasswordPwned(password);
        setIsPwned(result.isPwned);
        setCheckingPwned(false);
      };

      const timeoutId = setTimeout(checkPwned, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setPasswordValidation(null);
      setIsPwned(false);
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!passwordValidation?.isValid) {
      setError('Please fix password errors before continuing');
      return;
    }

    if (isPwned) {
      setError('This password has been found in data breaches. Please choose a different password.');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              API-Creator
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Create your account
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Start building APIs with AI in minutes
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {password && passwordValidation && (
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Password Strength: {getStrengthText(passwordValidation.strength)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthColor(passwordValidation.strength)}`}
                        style={{
                          width: `${
                            passwordValidation.strength === 'weak' ? '25%' :
                            passwordValidation.strength === 'fair' ? '50%' :
                            passwordValidation.strength === 'good' ? '75%' : '100%'
                          }`
                        }}
                      />
                    </div>
                  </div>

                  {passwordValidation.errors.length > 0 && (
                    <div className="space-y-1">
                      {passwordValidation.errors.map((err: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {checkingPwned && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Checking against known breaches...</span>
                    </div>
                  )}

                  {!checkingPwned && isPwned && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <Shield className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          Password Found in Data Breaches
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          This password has been exposed in data breaches. Please choose a different password.
                        </p>
                      </div>
                    </div>
                  )}

                  {!checkingPwned && !isPwned && passwordValidation.isValid && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>Password meets security requirements</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              isLoading={loading}
              className="w-full"
              disabled={!passwordValidation?.isValid || isPwned}
            >
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium mb-1">We take security seriously</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Your password is validated against NIST guidelines and checked against known data breaches using HaveIBeenPwned.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
