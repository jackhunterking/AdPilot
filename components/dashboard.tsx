"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AiChat from "./ai-chat"
import { Button } from "@/components/ui/button"
import { ChevronDown, ArrowLeft, Edit, Moon, Sun, Check, PanelLeftClose, PanelLeftOpen, Facebook, Instagram, AlertCircle } from "lucide-react"
import { COMPANY_NAME } from "@/lib/constants"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { UIMessage } from "ai"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { SaveIndicator } from "./save-indicator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { CampaignWorkspace } from "@/components/campaign-workspace"
import { MetaConnectionModal } from "@/components/meta/meta-connection-modal"
import { useMetaConnection } from "@/lib/hooks/use-meta-connection"
import { useMetaActions } from "@/lib/hooks/use-meta-actions"
import { Building2, CreditCard } from "lucide-react"
// Removed local heuristic name suggestion; naming is AI-driven on server

interface DashboardProps {
  messages?: UIMessage[]  // AI SDK v5 prop name
  campaignId?: string
  conversationId?: string | null  // Stable conversation ID from server
  campaignMetadata?: { initialPrompt?: string; initialGoal?: string | null } | null
}

export function Dashboard({ 
  messages = [],
  campaignId,
  conversationId,
  campaignMetadata,
}: DashboardProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [credits] = useState(205.5)
  
  // Check for conversationId override in URL (used when resetting for new ad)
  const conversationIdOverride = searchParams.get('conversationId')
  const effectiveConversationId = conversationIdOverride || conversationId
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [metaModalOpen, setMetaModalOpen] = useState(false)
  const dailyCredits = 500
  const { setTheme, resolvedTheme } = useTheme()
  const { campaign, updateCampaign } = useCampaignContext()
  const { metaStatus, paymentStatus } = useMetaConnection()
  const metaActions = useMetaActions()
  const [isConnecting, setIsConnecting] = useState(false)
  
  // Chat collapse state with localStorage persistence
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  
  // Load collapse preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('adpilot-chat-collapsed')
    if (saved !== null) {
      setIsChatCollapsed(saved === 'true')
    }
  }, [])
  
  // Save collapse preference to localStorage whenever it changes
  const toggleChatCollapse = () => {
    const newValue = !isChatCollapsed
    setIsChatCollapsed(newValue)
    localStorage.setItem('adpilot-chat-collapsed', String(newValue))
  }
  
  // Get workspace mode from URL to pass as context to AI Chat
  const viewMode = searchParams.get("view") as 'build' | 'edit' | 'all-ads' | 'results' | 'ab-test-builder' | null

  // Track current step from Campaign Stepper
  const [currentStepId, setCurrentStepId] = useState<string>('ads')
  
  useEffect(() => {
    const handleStepChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ stepId?: string }>
      if (customEvent.detail?.stepId) {
        setCurrentStepId(customEvent.detail.stepId)
      }
    }
    
    window.addEventListener('stepChanged', handleStepChanged)
    return () => window.removeEventListener('stepChanged', handleStepChanged)
  }, [])

  // Rename dialog state (lifted outside dropdown so it persists)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameName, setRenameName] = useState<string>("")
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renameSubmitting, setRenameSubmitting] = useState(false)
  const MAX_LEN = 20

  const openRename = () => {
    const current = campaign?.name ?? ""
    // If name is untitled or empty, simply prefill empty input; server enforces naming rules
    if (!current || /untitled/i.test(current)) {
      setRenameName("")
    } else {
      setRenameName(current.slice(0, MAX_LEN))
    }
    setRenameError(null)
    setTimeout(() => setRenameOpen(true), 0)
  }

  const submitRename = async () => {
    if (!campaign?.id) return
    const next = renameName.trim()
    if (!next) {
      setRenameError('Please enter a name')
      return
    }
    setRenameSubmitting(true)
    setRenameError(null)
    try {
      await updateCampaign({ name: next })
      setRenameOpen(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to rename'
      if (/409|unique|exists|used/i.test(msg)) {
        setRenameError('Name already used. Try a different word combination.')
      } else {
        setRenameError(msg)
      }
    } finally {
      setRenameSubmitting(false)
    }
  }


  // Note: Campaign loading is now handled by the nested CampaignProvider in app/[campaignId]/page.tsx
  // No need to manually call loadCampaign here

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Main Content - Chat and Preview side by side */}
      <div className="flex flex-1 overflow-hidden">
        {/* AI Chat - Collapsible sidebar */}
        <div className={`${isChatCollapsed ? 'w-14' : 'w-[30%]'} transition-all duration-300 ease-in-out bg-preview-panel text-preview-panel-foreground flex flex-col h-full`}>
          {/* Header - Only for left section */}
          <div className={`${isChatCollapsed ? 'flex-col items-center pt-3 pb-2' : 'flex h-12 items-center justify-between px-4'} flex bg-preview-panel text-preview-panel-foreground shrink-0`}>
            {isChatCollapsed ? (
              <>
                {/* Collapsed state: smaller logo + collapse button stacked vertically */}
                <div className="relative h-6 w-6">
                  <img src="/AdPilot-Logomark.svg" alt="AdPilot" className="h-6 w-6" />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 mt-2"
                  onClick={toggleChatCollapse}
                  aria-label="Expand sidebar"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                {/* Expanded state: full header */}
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8">
                    <img src="/AdPilot-Logomark.svg" alt="AdPilot" className="h-8 w-8" />
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-sm font-semibold truncate max-w-[160px]">{campaign?.name ?? COMPANY_NAME}</span>
                    <div className="-mt-0.5">
                      <SaveIndicator />
                    </div>
                  </div>
                  <DropdownMenu onOpenChange={setIsDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ChevronDown className={`h-4 w-4 transition-colors ${isDropdownOpen ? 'text-foreground' : 'text-muted-foreground'}`} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" alignOffset={-140} className="w-72">
                      <DropdownMenuItem onClick={() => router.push('/')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Credits</span>
                          <span className="text-sm font-medium">{credits} left</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                            style={{ width: `${(credits / dailyCredits) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />
                          Daily credits used first
                        </p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={openRename}>
                        <Edit className="mr-2 h-4 w-4" />
                        Rename ad
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          {resolvedTheme === "dark" ? (
                            <Moon className="mr-2 h-4 w-4" />
                          ) : (
                            <Sun className="mr-2 h-4 w-4" />
                          )}
                          Appearance
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => setTheme("light")}>
                            <Sun className="mr-2 h-4 w-4" />
                            Light
                            {resolvedTheme === "light" && <Check className="ml-auto h-4 w-4" />}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTheme("dark")}>
                            <Moon className="mr-2 h-4 w-4" />
                            Dark
                            {resolvedTheme === "dark" && <Check className="ml-auto h-4 w-4" />}
                          </DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      
                      {/* Meta Connection Section */}
                      {metaStatus === 'connected' ? (
                        <>
                          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                            Meta Connection
                          </DropdownMenuLabel>
                          <div className="px-2 py-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Facebook className="h-4 w-4" />
                                <Instagram className="h-4 w-4" />
                                <span className="text-sm font-medium">Connected</span>
                              </div>
                              {paymentStatus === 'verified' ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            
                            {(() => {
                              const summary = metaActions.getSummary()
                              return (
                                <>
                                  {summary?.business && (
                                    <div className="ml-4 py-1 text-xs">
                                      <div className="text-muted-foreground">Business</div>
                                      <div className="font-medium">{summary.business.name || summary.business.id}</div>
                                    </div>
                                  )}
                                  
                                  {summary?.page && (
                                    <div className="ml-4 py-1 text-xs">
                                      <div className="text-muted-foreground">Facebook Page</div>
                                      <div className="font-medium">{summary.page.name || summary.page.id}</div>
                                    </div>
                                  )}
                                  
                                  {summary?.instagram && (
                                    <div className="ml-4 py-1 text-xs">
                                      <div className="text-muted-foreground">Instagram</div>
                                      <div className="font-medium">@{summary.instagram.username || summary.instagram.id}</div>
                                    </div>
                                  )}
                                  
                                  {summary?.adAccount && (
                                    <div className="ml-4 py-1 text-xs">
                                      <div className="text-muted-foreground">Ad Account</div>
                                      <div className="font-medium">{summary.adAccount.name || summary.adAccount.id}</div>
                                    </div>
                                  )}
                                  
                                  {paymentStatus === 'missing' && summary?.adAccount?.id && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => summary.adAccount?.id && metaActions.addPayment(summary.adAccount.id)}>
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        Add Payment Method
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => {
                            setIsConnecting(true)
                            metaActions.connect()
                            setTimeout(() => setIsConnecting(false), 1000)
                          }}
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Facebook className="mr-2 h-4 w-4" />
                              <Instagram className="mr-2 h-4 w-4" />
                              Connect Meta
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Collapse Button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={toggleChatCollapse}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Rename Dialog mounted outside dropdown */}
            <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
              <DialogContent className="p-0">
                <DialogHeader className="p-4 pb-2">
                  <DialogTitle>Rename Campaign</DialogTitle>
                </DialogHeader>
                <div className="px-4 pb-2">
                  <input
                    value={renameName}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_LEN) setRenameName(e.target.value)
                    }}
                    maxLength={MAX_LEN}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="e.g. Bright Maple"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Less than 3 words</span>
                    <span className="text-[11px] text-muted-foreground">{renameName.length}/{MAX_LEN}</span>
                  </div>
                  {renameError && <p className="text-xs text-red-500 mt-2">{renameError}</p>}
                </div>
                <DialogFooter className="p-4 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setRenameOpen(false)} disabled={renameSubmitting}>Cancel</Button>
                  <Button size="sm" onClick={submitRename} disabled={renameSubmitting || renameName.trim().length === 0}>{renameSubmitting ? 'Saving…' : 'Save'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Meta Connection Modal */}
            <MetaConnectionModal 
              open={metaModalOpen}
              onOpenChange={setMetaModalOpen}
              onSuccess={() => setMetaModalOpen(false)}
            />
          </div>
          
          {/* AI Chat Content */}
          {!isChatCollapsed && (
            <AiChat 
              campaignId={campaignId}
              conversationId={effectiveConversationId}
              messages={conversationIdOverride ? [] : messages}
              campaignMetadata={campaignMetadata ?? undefined}
              context={viewMode || 'build'}
              currentStep={currentStepId}
            />
          )}
        </div>

        {/* Workspace - URL-based routing */}
        <div className="flex flex-1 flex-col overflow-hidden h-full min-h-0">
          <CampaignWorkspace />
        </div>
      </div>
    </div>
  )
}
