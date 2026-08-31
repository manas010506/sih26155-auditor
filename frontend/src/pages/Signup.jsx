import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

const InputField = ({ type = 'text', label, value, onChange, error }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
    <label style={{ fontSize: '12px', color: 'var(--ink-dim)' }}>{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      style={{
        padding: '10px 12px',
        backgroundColor: 'var(--substrate)',
        border: `1px solid ${error ? 'var(--severity-critical)' : 'var(--wire)'}`,
        color: 'var(--ink)',
        fontSize: '14px',
        outline: 'none',
        borderRadius: '2px'
      }}
      onFocus={(e) => {
        if (!error) e.target.style.borderColor = 'var(--trace)';
      }}
      onBlur={(e) => {
        if (!error) e.target.style.borderColor = 'var(--wire)';
      }}
    />
    {error && <div style={{ fontSize: '11px', color: 'var(--severity-critical)' }}>{error}</div>}
  </div>
);

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleSignup = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name) newErrors.name = 'Name is required.';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!password || password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    } else {
      setErrors({});
      // mock success
      navigate('/audit/upload');
    }
  };

  return (
    <div className="bg-grid" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="bezel-panel corner-marks" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
          <Shield size={24} className="text-trace" />
          <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            CREATE<br />ACCOUNT
          </div>
        </div>

        <form onSubmit={handleSignup}>
          <InputField
            label="Full Name"
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors(prev => ({...prev, name: ''})) }}
            error={errors.name}
          />
          <InputField
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({...prev, email: ''})) }}
            error={errors.email}
          />
          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({...prev, password: ''})) }}
            error={errors.password}
          />
          <InputField
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrors(prev => ({...prev, confirmPassword: ''})) }}
            error={errors.confirmPassword}
          />

          <button
            type="submit"
            style={{
              width: '100%', padding: '12px',
              backgroundColor: 'var(--trace)', color: 'var(--substrate)',
              fontWeight: 600, fontSize: '14px', marginTop: '8px',
              display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
          >
            Create account
          </button>
        </form>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', fontSize: '12px' }}>
          <Link to="/login" style={{ color: 'var(--ink-dim)' }}>Back to login</Link>
        </div>
      </div>
      
      <div className="mono" style={{ position: 'absolute', bottom: '24px', right: '24px', fontSize: '10px', color: 'var(--wire)' }}>
        SIH26155 · v0.1
      </div>
    </div>
  );
};

export default Signup;
