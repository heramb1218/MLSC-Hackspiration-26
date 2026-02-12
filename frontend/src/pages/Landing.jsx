import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ShieldCheck, TrendingUp, Users } from 'lucide-react';

const Landing = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white font-sans text-gray-900">
            {/* Navbar */}
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Building2 className="text-brand-600 w-8 h-8" />
                    <span className="text-2xl font-bold text-gray-900 tracking-tight">CampusTrust</span>
                </div>
                <div className="flex gap-4">
                    <Link to="/login" className="text-gray-600 hover:text-brand-600 font-medium transition px-4 py-2">
                        Log In
                    </Link>
                    <Link to="/login" className="bg-brand-600 text-white px-6 py-2 rounded-full font-medium hover:bg-brand-700 transition shadow-lg hover:shadow-brand-500/30">
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">

                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
                        Financial Trust <br />
                        <span className="text-brand-600">Built by You.</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-lg">
                        A decentralized student finance platform. Build your reputation, access micro-loans, and grow together without banks.
                    </p>
                    <div className="flex gap-4">
                        <Link to="/login" className="bg-gray-900 text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition shadow-xl">
                            Start Building Trust
                        </Link>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative"
                >
                    <div className="absolute -inset-4 bg-brand-200 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                    <img
                        src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1632&q=80"
                        alt="Students using app"
                        className="relative rounded-2xl shadow-2xl border-4 border-white transform rotate-2 hover:rotate-0 transition duration-500"
                    />
                </motion.div>
            </main>

            {/* Features */}
            <section className="bg-white py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-12">
                        {[
                            { icon: ShieldCheck, title: "Reputation Based", desc: "Your financial behavior builds your trust score. Higher score = better loans." },
                            { icon: Users, title: "Community Pool", desc: "Contribute to the shared pool and help peers while earning trust." },
                            { icon: TrendingUp, title: "Transparent Growth", desc: "Track every transaction on a transparent ledger. No hidden fees." }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.2 }}
                                className="p-8 rounded-2xl bg-gray-50 hover:bg-brand-50 transition border border-gray-100"
                            >
                                <feature.icon className="w-12 h-12 text-brand-600 mb-6" />
                                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                <p className="text-gray-600">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Landing;
