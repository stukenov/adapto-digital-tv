'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuth, login } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n/I18nProvider';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function AdminIndex() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    (async () => {
      const ok = await checkAuth();
      setIsAuthed(ok);
      if (ok) {
        // default redirect will be handled in section pages based on current channel
        router.replace('/admin/schedule');
      }
    })();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = await login(username, password);
    setIsAuthed(ok);
    if (!ok) setError(t('admin.login.error.invalid'));
  };

  // удалён неиспользуемый handleLogout

  if (isAuthed === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">{t('admin.login.loading')}</p>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="relative flex min-h-[70vh] items-center justify-center px-4">
        <div className="absolute right-4 top-4">
          <LanguageSwitcher />
        </div>
        <Card className="w-full max-w-md border shadow-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">{t('admin.login.title')}</CardTitle>
            <CardDescription>{t('admin.login.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">{t('admin.login.username')}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('admin.login.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full">{t('admin.login.submit')}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}


