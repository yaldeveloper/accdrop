"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dots, Wordmark } from "@/components/brand";
import { LoginFlow } from "@/components/login";
import { useAccount } from "@/components/account";

function Login() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/account";
  const { ready, user } = useAccount();
  // Already signed in when the page opened: skip the form. (Not on later changes, so new users still see the name step.)
  const checked = useRef(false);
  useEffect(() => {
    if (!ready || checked.current) return;
    checked.current = true;
    if (user) router.replace(next);
  }, [ready, user, next, router]);
  return (
    <div className="auth wrap">
      <div className="auth-card">
        <div className="auth-top"><Wordmark /><Dots size={4} /></div>
        <LoginFlow onDone={() => router.replace(next)} />
      </div>
      <ul className="auth-why">
        <li><b>پاس‌هایت یک‌جا</b><span>روزهای باقی‌مانده هر اشتراک و تمدید با یک کلیک.</span></li>
        <li><b>پیگیری لحظه‌ای</b><span>از پرداخت تا فعال‌سازی، قدم‌به‌قدم.</span></li>
        <li><b>پشتیبانی و تیکت</b><span>سؤال‌ها و پیگیری‌هایت، همه در یک جا.</span></li>
      </ul>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><Login /></Suspense>;
}
