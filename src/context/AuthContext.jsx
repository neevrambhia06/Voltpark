
import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null); // IMPORTANT: null instead of "user" to prevent premature routing
    const [approvalStatus, setApprovalStatus] = useState("none"); // default
    const [userEmailFromDB, setUserEmailFromDB] = useState(""); // content
    // Track actual current role via ref to avoid stale closure in async callbacks
    const currentRoleRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        const initSession = async () => {
            try {
                // Step 1: Get existing session from localStorage
                const { data: { session }, error } = await supabase.auth.getSession();

                if (!mounted) return;

                if (session?.user) {
                    setSession(session);
                    setUser(session.user);
                    // Step 2: Fetch user role from users or owner_profiles
                    await fetchGetUserProfile(session.user.id);
                } else {
                    setUser(null);
                    setSession(null);
                    setUserRole(null);
                }
            } catch (err) {
                console.error('Session init error:', err);
                if (mounted) {
                    setUser(null);
                    setSession(null);
                    setUserRole(null);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initSession();

        // Step 3: Listen for auth changes AFTER init
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;

                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setSession(null);
                    setUserRole(null);
                    currentRoleRef.current = null;
                    setApprovalStatus("none");
                    setUserEmailFromDB("");
                    setLoading(false);
                    return;
                }

                if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
                    if (session?.user) {
                        setSession(session);
                        setUser(session.user);

                        // If SIGNED_IN, handle auto-profile creation logic
                        if (event === 'SIGNED_IN') {
                            // Brief delay to allow manual profile creation to settle during signups
                            setTimeout(async () => {
                                try {
                                    const { data: existingUser } = await supabase.from('users').select('id').eq('id', session.user.id).maybeSingle();
                                    if (!existingUser) {
                                        const { data: existingOwner } = await supabase.from('owner_profiles').select('id').eq('id', session.user.id).maybeSingle();
                                        const metaRole = session.user.user_metadata?.role;
                                        if (!existingOwner && metaRole !== 'owner') {
                                            console.log("VOLTPARK: Creating default user profile for new login");
                                            await supabase.from('users').insert([{
                                                id: session.user.id,
                                                email: session.user.email,
                                                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                                                role: 'user',
                                                approval_status: 'none',
                                                created_at: new Date().toISOString()
                                            }]);
                                        }
                                    }
                                } catch (err) { console.error("Auto-profile err:", err); }
                            }, 1000);
                        }

                        await fetchGetUserProfile(session.user.id);
                    }
                    setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchGetUserProfile = async (userId) => {
        // Tighter internal timeout for profile fetching, but relaxed to 15s for stability on slow networks
        const profileTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Profile fetch timeout")), 45000)
        );

        try {
            const fetchPromise = (async () => {
                // 1. Try fetching from USERS table first
                let { data, error } = await supabase
                    .from('users')
                    .select('role, approval_status, email')
                    .eq('id', userId)
                    .maybeSingle();

                if (data) {
                    console.log("✔ Fetched Profile from Users:", data.role);
                    return data;
                }

                // 2. If not found, try OWNER_PROFILES
                const { data: ownerData } = await supabase
                    .from('owner_profiles')
                    .select('role, approval_status, email')
                    .eq('id', userId)
                    .maybeSingle();

                if (ownerData) {
                    console.log("✔ Fetched Profile from Owner Profiles:", ownerData.role);
                    return ownerData;
                }
                
                return null;
            })();

            const result = await Promise.race([fetchPromise, profileTimeout]);

            if (result) {
                currentRoleRef.current = result.role;
                setUserRole(result.role);
                setApprovalStatus(result.approval_status || 'none');
                setUserEmailFromDB(result.email || "");
                console.log("✔ Profile active:", result.role);
            } else {
                console.warn("⚠ User profile not found in users OR owner_profiles!");
                // Only set fallback if we have never successfully fetched a role
                if (!currentRoleRef.current) {
                    const metaRole = user?.user_metadata?.role;
                    const fallback = metaRole || "user";
                    currentRoleRef.current = fallback;
                    setUserRole(fallback);
                }
            }
        } catch (err) {
            console.error("Fetch profile error:", err);
            // CRITICAL: Only set fallback if we have NO previous good role (ref-safe, not stale state)
            if (!currentRoleRef.current) {
                const metaRole = user?.user_metadata?.role;
                const fallback = metaRole || "user";
                currentRoleRef.current = fallback;
                setUserRole(fallback);
            }
            // else: silently preserve the existing valid role (e.g. 'owner')
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email, password, name) => {
        console.log("Starting signup process for:", email);
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    name: name.trim(),
                },
            },
        });

        if (error) {
            console.error("Supabase Auth Error:", error);
            return { data, error };
        }

        if (data?.user) {
            console.log("Auth user created successfully:", data.user.id);

            const { error: insertError } = await supabase.from('users').insert([{
                id: data.user.id,
                email: email.trim(),
                name: name.trim(),
                role: 'user',
                approval_status: 'none',
                created_at: new Date().toISOString()
            }]);

            if (insertError) {
                console.error("Insert into users table failure:", insertError);
                return { data, error: { message: "Account created but profile not saved." } };
            }
        }
        return { data, error };
    };

    // New Owner Signup
    const signUpOwner = async (email, password, name, company, city) => {
        console.log("Starting OWNER signup process for:", email);
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    name: name.trim(),
                    role: 'owner'
                },
            },
        });

        if (error) {
            console.error("Supabase Auth Error:", error);
            return { data, error };
        }

        if (data?.user) {
            console.log("Auth (Owner) user created successfully:", data.user.id);

            // Insert ONLY into owner_profiles table
            // We NO LONGER insert into public.users for owners
            // Use upsert to handle cases where the profile already exists (e.g. manually migrated)
            const { error: profileError } = await supabase.from('owner_profiles').upsert([{
                id: data.user.id,
                name: name.trim(),
                email: email.trim(),
                role: 'owner',
                approval_status: 'pending',
                company_name: company.trim(),
                city: city.trim(),
                created_at: new Date().toISOString()
            }], { onConflict: 'id' });

            if (profileError) {
                console.error("Insert into owner_profiles failure:", profileError);
                return { data, error: { message: "Account created but owner profile details failed. Please contact support." } };
            }

            console.log("Owner registration complete.");
        }
        return { data, error };
    };

    const login = (email, password) => {
        return supabase.auth.signInWithPassword({ email: email.trim(), password });
    };

    const signInWithGoogle = async () => {
        return supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/user-dashboard`
            }
        });
    };

    const logout = async () => {
        console.log("VOLTPARK: Starting logout...");
        try {
            // IMMEDIATE local state reset to unblock UI
            setUser(null);
            setSession(null);
            setUserRole(null);
            setApprovalStatus("none");
            setUserEmailFromDB("");
            setLoading(false);
            
            // Background the actual network call
            supabase.auth.signOut().catch(e => console.error("SignOut error:", e));
        } catch (err) {
            console.error("Logout logic error:", err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, userRole, approvalStatus, userEmailFromDB, signUp, signUpOwner, login, signInWithGoogle, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
