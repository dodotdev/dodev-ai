"use client"

import { api } from "@dodev/convex/api"
import { useMutation, useQuery } from "convex/react"
import { createContext, useContext, useEffect, useRef } from "react"

interface AuthContextValue {
  user: {
    _id: string
    workosUserId: string
    email: string
    name?: string
    apiKey: string
    apiKeyHash: string
    plan: string
  } | null
  apiKeyHash: string | null
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  apiKeyHash: null,
  isLoading: true,
})

export function useAuth() {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  workosUserId: string
  email: string
  name?: string
  children: React.ReactNode
}

export function AuthProvider({ workosUserId, email, name, children }: AuthProviderProps) {
  const ensureUser = useMutation(api.users.createOrUpdateFromWorkOS)
  const user = useQuery(api.users.getByWorkosId, { workosUserId })
  const ensuredRef = useRef(false)

  useEffect(() => {
    if (!ensuredRef.current) {
      ensuredRef.current = true
      ensureUser({ workosUserId, email, name }).catch(console.error)
    }
  }, [ensureUser, workosUserId, email, name])

  const isLoading = user === undefined
  const apiKeyHash = user?.apiKeyHash ?? null

  return (
    <AuthContext.Provider
      value={{
        user: user
          ? {
              _id: user._id as string,
              workosUserId: user.workosUserId,
              email: user.email,
              name: user.name,
              apiKey: user.apiKey,
              apiKeyHash: user.apiKeyHash,
              plan: user.plan,
            }
          : null,
        apiKeyHash,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
