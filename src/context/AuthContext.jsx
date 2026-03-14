
import { createContext, useContext, useEffect, useState } from 'react';
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

    useEffect(() => {
        // FIX C: Global loading hard cap
        if (loading) {
            const hardTimeout = setTimeout(() => {
                setLoading(false);
                console.warn('VOLTPARK: Hard timeout — forced load');
            }, 5000);
            return () => clearTimeout(hardTimeout);
        }
    }, [loading]);

    useEffect(() => {
        const initAuth = async () => {
            try {
                // FIX A: getSession() timeout
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((resolve) =>
                    setTimeout(() => resolve({ data: { session: null }, error: null }), 3000)
                );

                const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);
                if (error) throw error;

                const session = data?.session;
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    await fetchGetUserProfile(session.user.id);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error("Auth check failed:", err);
                setUser(null);
                setLoading(false);
            }
        };

        initAuth();

        // FIX B: onAuthStateChange() safety net
        const authTimeout = setTimeout(() => {
            // Only force loading false if we haven't found a user/session yet
            // If we have a session but role is pending, let Fix C or fetchUserProfile handle it
            if (!user && !session) {
                setLoading(false);
                console.warn('VOLTPARK: Safety timeout — no session found');
            }
        }, 3000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            clearTimeout(authTimeout); // cancel if auth responds
            try {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    // FIX: Safer auto-profile creation
                    if (_event === 'SIGNED_IN') {
                        // Wait a tiny bit to let manual profile creation finish if this is a signup
                        setTimeout(async () => {
                            try {
                                const { data: existingUser } = await supabase.from('users').select('id').eq('id', session.user.id).maybeSingle();
                                if (!existingUser) {
                                    const { data: existingOwner } = await supabase.from('owner_profiles').select('id').eq('id', session.user.id).maybeSingle();
                                    // ONLY create a default 'user' profile if they aren't an owner AND didn't just sign up as an owner
                                    // Hint: Check metadata role if available
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
                } else {
                    setUserRole(null);
                    setApprovalStatus("none");
                    setUserEmailFromDB("");
                }
            } catch (authContentError) {
                console.error("Critical AuthStateChange Error:", authContentError);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(authTimeout);
        };
    }, []);

    const fetchGetUserProfile = async (userId) => {
        // Tighter internal timeout for profile fetching, but relaxed to 15s for stability on slow networks
        const profileTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Profile fetch timeout")), 15000)
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
                setUserRole(result.role);
                setApprovalStatus(result.approval_status || 'none');
                setUserEmailFromDB(result.email || "");
                console.log("✔ Profile active:", result.role);
            } else {
                console.warn("⚠ User profile not found in users OR owner_profiles!");
                // Final fallback if we are absolutely sure there is no profile
                if (!userRole) {
                    const metaRole = user?.user_metadata?.role;
                    setUserRole(metaRole || "user");
                }
            }
        } catch (err) {
            console.error("Fetch profile error:", err);
            // Don't overwrite if we already have a role (e.g. from a previous successful fetch)
            if (!userRole) {
                const metaRole = user?.user_metadata?.role;
                setUserRole(metaRole || "user");
            }
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
