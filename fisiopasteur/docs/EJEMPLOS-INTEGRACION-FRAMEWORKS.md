# 🔌 EJEMPLOS DE INTEGRACIÓN EN DIFERENTES FRAMEWORKS

## 🎯 React (Next.js) - Recomendado

Ya creado en: `src/componentes/onboarding/OnboardingFormExample.tsx`

---

## ⚛️ React Puro (sin Next.js)

```jsx
import { useState } from 'react';

export default function OnboardingForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    nombreOrganizacion: '',
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('https://tu-dominio.com/api/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.data.redirectUrl;
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
        required
      />
      <input
        type="text"
        placeholder="Nombre"
        value={formData.nombre}
        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
        required
      />
      <input
        type="text"
        placeholder="Apellido"
        value={formData.apellido}
        onChange={(e) => setFormData({...formData, apellido: e.target.value})}
        required
      />
      <input
        type="text"
        placeholder="Nombre de Organización"
        value={formData.nombreOrganizacion}
        onChange={(e) => setFormData({...formData, nombreOrganizacion: e.target.value})}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Registrando...' : 'Crear Cuenta'}
      </button>
    </form>
  );
}
```

---

## 🅰️ Angular

```typescript
// onboarding.component.ts
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html'
})
export class OnboardingComponent {
  formData = {
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    nombreOrganizacion: '',
    plan: 'basic'
  };
  
  loading = false;
  error = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  async onSubmit() {
    this.loading = true;
    this.error = '';

    this.http.post('/api/onboarding/register', this.formData)
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            window.location.href = response.data.redirectUrl;
          }
        },
        error: (err) => {
          this.error = err.error?.error || 'Error al registrar';
          this.loading = false;
        }
      });
  }
}
```

```html
<!-- onboarding.component.html -->
<form (ngSubmit)="onSubmit()">
  <div *ngIf="error" class="error">{{ error }}</div>

  <input
    type="email"
    [(ngModel)]="formData.email"
    name="email"
    placeholder="Email"
    required
  />
  
  <input
    type="password"
    [(ngModel)]="formData.password"
    name="password"
    placeholder="Contraseña"
    required
  />
  
  <input
    type="text"
    [(ngModel)]="formData.nombre"
    name="nombre"
    placeholder="Nombre"
    required
  />
  
  <input
    type="text"
    [(ngModel)]="formData.apellido"
    name="apellido"
    placeholder="Apellido"
    required
  />
  
  <input
    type="text"
    [(ngModel)]="formData.nombreOrganizacion"
    name="nombreOrganizacion"
    placeholder="Nombre de Organización"
    required
  />

  <button type="submit" [disabled]="loading">
    {{ loading ? 'Registrando...' : 'Crear Cuenta' }}
  </button>
</form>
```

---

## 🟢 Vue 3 (Composition API)

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div v-if="error" class="error">{{ error }}</div>

    <input
      v-model="formData.email"
      type="email"
      placeholder="Email"
      required
    />
    
    <input
      v-model="formData.password"
      type="password"
      placeholder="Contraseña"
      required
    />
    
    <input
      v-model="formData.nombre"
      type="text"
      placeholder="Nombre"
      required
    />
    
    <input
      v-model="formData.apellido"
      type="text"
      placeholder="Apellido"
      required
    />
    
    <input
      v-model="formData.nombreOrganizacion"
      type="text"
      placeholder="Nombre de Organización"
      required
    />

    <button type="submit" :disabled="loading">
      {{ loading ? 'Registrando...' : 'Crear Cuenta' }}
    </button>
  </form>
</template>

<script setup>
import { ref } from 'vue';

const formData = ref({
  email: '',
  password: '',
  nombre: '',
  apellido: '',
  nombreOrganizacion: '',
  plan: 'basic'
});

const loading = ref(false);
const error = ref('');

const handleSubmit = async () => {
  loading.value = true;
  error.value = '';

  try {
    const response = await fetch('/api/onboarding/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value)
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = data.data.redirectUrl;
    } else {
      error.value = data.error;
    }
  } catch (err) {
    error.value = 'Error de conexión';
  } finally {
    loading.value = false;
  }
};
</script>
```

---

## 📱 React Native

```jsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';

export default function OnboardingScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    nombreOrganizacion: '',
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const response = await fetch('https://tu-dominio.com/api/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Cuenta creada correctamente');
        // Navegar a login
        navigation.navigate('Login', { email: formData.email });
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (err) {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={formData.email}
        onChangeText={(text) => setFormData({...formData, email: text})}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Contraseña"
        value={formData.password}
        onChangeText={(text) => setFormData({...formData, password: text})}
        secureTextEntry
      />
      <TextInput
        placeholder="Nombre"
        value={formData.nombre}
        onChangeText={(text) => setFormData({...formData, nombre: text})}
      />
      <TextInput
        placeholder="Apellido"
        value={formData.apellido}
        onChangeText={(text) => setFormData({...formData, apellido: text})}
      />
      <TextInput
        placeholder="Nombre de Organización"
        value={formData.nombreOrganizacion}
        onChangeText={(text) => setFormData({...formData, nombreOrganizacion: text})}
      />
      <Button
        title={loading ? 'Registrando...' : 'Crear Cuenta'}
        onPress={handleSubmit}
        disabled={loading}
      />
    </View>
  );
}
```

---

## 🌐 HTML + JavaScript Vanilla

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Registro</title>
  <style>
    .error { color: red; margin-bottom: 10px; }
    .loading { opacity: 0.5; pointer-events: none; }
    form { max-width: 400px; margin: 50px auto; }
    input { width: 100%; padding: 10px; margin-bottom: 10px; }
    button { width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; cursor: pointer; }
  </style>
</head>
<body>
  <form id="registroForm">
    <div id="error" class="error" style="display: none;"></div>

    <input type="email" id="email" placeholder="Email" required>
    <input type="password" id="password" placeholder="Contraseña" minlength="6" required>
    <input type="text" id="nombre" placeholder="Nombre" required>
    <input type="text" id="apellido" placeholder="Apellido" required>
    <input type="text" id="organizacion" placeholder="Nombre de Organización" required>
    
    <select id="plan">
      <option value="basic">Plan Básico</option>
      <option value="premium">Plan Premium</option>
      <option value="enterprise">Plan Enterprise</option>
    </select>

    <button type="submit" id="submitBtn">Crear Cuenta</button>
  </form>

  <script>
    const form = document.getElementById('registroForm');
    const errorDiv = document.getElementById('error');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Limpiar error anterior
      errorDiv.style.display = 'none';
      
      // Deshabilitar botón y cambiar texto
      form.classList.add('loading');
      submitBtn.textContent = 'Registrando...';

      const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        nombreOrganizacion: document.getElementById('organizacion').value,
        plan: document.getElementById('plan').value
      };

      try {
        const response = await fetch('/api/onboarding/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
          // Mostrar éxito
          alert('¡Cuenta creada exitosamente! Redirigiendo...');
          
          // Redirigir al login
          window.location.href = data.data.redirectUrl;
        } else {
          // Mostrar error
          errorDiv.textContent = data.error;
          errorDiv.style.display = 'block';
        }
      } catch (error) {
        errorDiv.textContent = 'Error de conexión. Intenta nuevamente.';
        errorDiv.style.display = 'block';
      } finally {
        // Rehabilitar botón
        form.classList.remove('loading');
        submitBtn.textContent = 'Crear Cuenta';
      }
    });
  </script>
</body>
</html>
```

---

## 🚀 Svelte

```svelte
<script>
  let formData = {
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    nombreOrganizacion: '',
    plan: 'basic'
  };
  
  let loading = false;
  let error = '';

  async function handleSubmit(e) {
    e.preventDefault();
    loading = true;
    error = '';

    try {
      const response = await fetch('/api/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = data.data.redirectUrl;
      } else {
        error = data.error;
      }
    } catch (err) {
      error = 'Error de conexión';
    } finally {
      loading = false;
    }
  }
</script>

<form on:submit={handleSubmit}>
  {#if error}
    <div class="error">{error}</div>
  {/if}

  <input
    type="email"
    bind:value={formData.email}
    placeholder="Email"
    required
  />
  
  <input
    type="password"
    bind:value={formData.password}
    placeholder="Contraseña"
    required
  />
  
  <input
    type="text"
    bind:value={formData.nombre}
    placeholder="Nombre"
    required
  />
  
  <input
    type="text"
    bind:value={formData.apellido}
    placeholder="Apellido"
    required
  />
  
  <input
    type="text"
    bind:value={formData.nombreOrganizacion}
    placeholder="Nombre de Organización"
    required
  />

  <button type="submit" disabled={loading}>
    {loading ? 'Registrando...' : 'Crear Cuenta'}
  </button>
</form>

<style>
  .error {
    color: red;
    margin-bottom: 10px;
  }
</style>
```

---

## 📱 Flutter (Dart)

```dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class OnboardingScreen extends StatefulWidget {
  @override
  _OnboardingScreenState createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  String _error = '';

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nombreController = TextEditingController();
  final _apellidoController = TextEditingController();
  final _organizacionController = TextEditingController();

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _error = '';
    });

    try {
      final response = await http.post(
        Uri.parse('https://tu-dominio.com/api/onboarding/register'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': _emailController.text,
          'password': _passwordController.text,
          'nombre': _nombreController.text,
          'apellido': _apellidoController.text,
          'nombreOrganizacion': _organizacionController.text,
          'plan': 'basic',
        }),
      );

      final data = json.decode(response.body);

      if (data['success']) {
        // Navegar a login
        Navigator.pushNamed(context, '/login', arguments: {
          'email': _emailController.text,
        });
      } else {
        setState(() {
          _error = data['error'];
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Error de conexión';
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Registro')),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              if (_error.isNotEmpty)
                Text(_error, style: TextStyle(color: Colors.red)),
              
              TextFormField(
                controller: _emailController,
                decoration: InputDecoration(labelText: 'Email'),
                keyboardType: TextInputType.emailAddress,
                validator: (value) => value!.isEmpty ? 'Requerido' : null,
              ),
              
              TextFormField(
                controller: _passwordController,
                decoration: InputDecoration(labelText: 'Contraseña'),
                obscureText: true,
                validator: (value) =>
                    value!.length < 6 ? 'Mínimo 6 caracteres' : null,
              ),
              
              TextFormField(
                controller: _nombreController,
                decoration: InputDecoration(labelText: 'Nombre'),
                validator: (value) => value!.isEmpty ? 'Requerido' : null,
              ),
              
              TextFormField(
                controller: _apellidoController,
                decoration: InputDecoration(labelText: 'Apellido'),
                validator: (value) => value!.isEmpty ? 'Requerido' : null,
              ),
              
              TextFormField(
                controller: _organizacionController,
                decoration: InputDecoration(labelText: 'Organización'),
                validator: (value) => value!.isEmpty ? 'Requerido' : null,
              ),
              
              SizedBox(height: 20),
              
              ElevatedButton(
                onPressed: _loading ? null : _handleSubmit,
                child: Text(_loading ? 'Registrando...' : 'Crear Cuenta'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

## 🔥 Firebase Functions (Backend alternativo)

Si tu compañero quiere usar Firebase en lugar de Next.js API:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.registerUser = functions.https.onCall(async (data, context) => {
  const { email, password, nombre, apellido, nombreOrganizacion } = data;

  try {
    // 1. Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${nombre} ${apellido}`,
    });

    // 2. Llamar a tu API de Next.js para crear org
    const response = await fetch('https://tu-dominio.com/api/onboarding/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        nombre,
        apellido,
        nombreOrganizacion,
      }),
    });

    const result = await response.json();

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

---

## 📝 Notas Importantes

1. **URL del API**: Reemplaza `/api/onboarding/register` con la URL completa si es externo
2. **CORS**: Si el frontend está en otro dominio, configura CORS en Next.js
3. **Validaciones**: Siempre valida en frontend Y backend
4. **Errores**: Maneja todos los casos de error
5. **Loading**: Muestra feedback visual durante el proceso

---

**Todos estos ejemplos hacen exactamente lo mismo: llamar a tu API de Next.js para crear usuario + organización.**
