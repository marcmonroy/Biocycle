import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [lang, setLang] = useState<'en' | 'es'>('es');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isEnglish = lang === 'en';

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage(isEnglish ? 'Account created. You can now sign in.' : 'Cuenta creada. Ya puedes iniciar sesion.');
        setMode('login');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage(isEnglish ? 'We sent you an email to reset your password.' : 'Te enviamos un correo para restablecer tu contrasena.');
        setMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEnglish ? 'An error occurred' : 'Ocurrio un error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrio un error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors"
          >
            {lang === 'en' ? 'ES' : 'EN'}
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-rose-400 to-amber-400 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
            <span className="text-3xl text-white font-bold">B</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isEnglish ? 'Know yourself before it happens.' : 'Conocete antes de que suceda.'}
          </h1>
          <p className="text-lg font-medium text-gray-700 mb-4">
            {isEnglish ? 'Knowing yourself pays.' : 'Conocerte paga.'}
          </p>
          <div className="text-sm text-gray-600 leading-relaxed space-y-1">
            <p>{isEnglish ? 'BioCycle is your biological data bank.' : 'BioCycle es tu banco de datos biologicos.'}</p>
            <p>{isEnglish ? 'Every check-in is a deposit that grows in value over time.' : 'Cada check-in es un deposito que crece en valor con el tiempo.'}</p>
            <p>{isEnglish ? 'Your patterns are your commodity.' : 'Tus patrones son tu mercancia.'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">Google</span>
            </button>

            <button
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Apple</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">{isEnglish ? 'or with email' : 'o con email'}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-green-600 text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all"
                  placeholder={isEnglish ? 'you@email.com' : 'tu@email.com'}
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isEnglish ? 'Password' : 'Contrasena'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all"
                    placeholder="********"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-rose-400 to-amber-400 text-white font-semibold rounded-xl hover:from-rose-500 hover:to-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' && (isEnglish ? 'Sign in' : 'Iniciar sesion')}
                  {mode === 'signup' && (isEnglish ? 'Create account' : 'Crear cuenta')}
                  {mode === 'forgot' && (isEnglish ? 'Send link' : 'Enviar enlace')}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center space-y-2 text-sm">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => setMode('forgot')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isEnglish ? 'Forgot your password?' : 'Olvidaste tu contrasena?'}
                </button>
                <div>
                  <span className="text-gray-500">{isEnglish ? "Don't have an account? " : 'No tienes cuenta? '}</span>
                  <button
                    onClick={() => setMode('signup')}
                    className="text-rose-500 font-medium hover:text-rose-600"
                  >
                    {isEnglish ? 'Create one' : 'Crear una'}
                  </button>
                </div>
              </>
            )}
            {mode === 'signup' && (
              <div>
                <span className="text-gray-500">{isEnglish ? 'Already have an account? ' : 'Ya tienes cuenta? '}</span>
                <button
                  onClick={() => setMode('login')}
                  className="text-rose-500 font-medium hover:text-rose-600"
                >
                  {isEnglish ? 'Sign in' : 'Iniciar sesion'}
                </button>
              </div>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => setMode('login')}
                className="text-rose-500 font-medium hover:text-rose-600"
              >
                {isEnglish ? 'Back to sign in' : 'Volver a iniciar sesion'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
