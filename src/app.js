// AI DM HUB – Main Application Logic

class AIHubApp {
    constructor() {
        this.currentConversationId = null;
        this.currentCaseId = null;
        this.currentTab = "messages"; // "messages" or "cases"
        // Current user is Erik (Maskingruppsansvarig) - the one reviewing alarms
        this.currentUserId = mockData.users[1].userId; // usr_002 = Erik Svensson
        this.alarmTriggeredAt = null;
        this.alarmTimeout = null;
        this.acknowledgementCountdown = null;
        this.countdownInterval = null;
        this.sounds = this.initializeSounds();
        this.init();
    }

    initializeSounds() {
        // Create single audio context for all sound effects
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        return true;
    }

    playSound(soundType) {
        // Play sound effect using Web Audio API
        try {
            if (!this.audioContext) return;

            const ctx = this.audioContext;
            const now = ctx.currentTime;

            // Define sound parameters
            const sounds = {
                notification: { freq: 800, dur: 0.1, vol: 0.1 },
                alarm: { freq: 1200, dur: 0.3, vol: 0.15 },
                acknowledged: { freq: 600, dur: 0.1, vol: 0.1 },
                sent: { freq: 700, dur: 0.05, vol: 0.08 }
            };

            if (!sounds[soundType]) return;

            const sound = sounds[soundType];
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            gain.gain.setValueAtTime(sound.vol, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + sound.dur);

            osc.frequency.value = sound.freq;
            osc.type = 'sine';
            osc.start(now);
            osc.stop(now + sound.dur);
        } catch (e) {
            console.log('Audio play error:', e.message);
        }
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderDMList();
        this.startAlarmTimer();
    }

    cacheDOM() {
        // Tabs
        this.tabMessages = document.getElementById("tabMessages");
        this.tabCases = document.getElementById("tabCases");
        this.messagesPanel = document.getElementById("messagesPanel");
        this.casesPanel = document.getElementById("casesPanel");

        // Messages
        this.dmList = document.getElementById("dmList");
        this.casesList = document.getElementById("casesList");
        this.messageInput = document.getElementById("messageInput");
        this.sendBtn = document.getElementById("sendBtn");
        this.resetBtn = document.getElementById("resetBtn");
        this.historyToggleBtn = document.getElementById("historyToggleBtn");
        this.settingsBtn = document.getElementById("settingsBtn");
        this.conversationPanel = document.querySelector(".conversation-panel");
        this.noSelection = document.getElementById("noSelection");
        this.conversationView = document.getElementById("conversationView");
        this.messagesContainer = document.getElementById("messagesContainer");
        this.conversationTitle = document.getElementById("conversationTitle");
        this.alarmBanner = document.getElementById("alarmBanner");
        this.alarmTitle = document.getElementById("alarmTitle");
        this.alarmMachine = document.getElementById("alarmMachine");
        this.alarmReason = document.getElementById("alarmReason");
        this.ackBtn = document.getElementById("ackBtn");
        this.decisionBtn = document.getElementById("decisionBtn");
        this.delegationBtn = document.getElementById("delegationBtn");
        this.actionBtn = document.getElementById("actionBtn");
        this.historyPanel = document.getElementById("historyPanel");
        this.historyContent = document.getElementById("historyContent");
        this.closeHistoryBtn = document.getElementById("closeHistoryBtn");
    }

    bindEvents() {
        // Tab navigation
        document.getElementById("tabMessages").addEventListener("click", () => this.switchTab("messages"));
        document.getElementById("tabCases").addEventListener("click", () => this.switchTab("cases"));

        this.sendBtn.addEventListener("click", () => this.handleSendMessage());
        this.messageInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !e.shiftKey) this.handleSendMessage();
        });
        this.resetBtn.addEventListener("click", () => this.handleReset());
        this.historyToggleBtn?.addEventListener("click", () => this.toggleHistory());
        this.settingsBtn?.addEventListener("click", () => this.showSettings());
        this.ackBtn.addEventListener("click", () => this.handleAcknowledge());
        this.decisionBtn.addEventListener("click", () => this.openModal("decisionModal"));
        this.delegationBtn.addEventListener("click", () => this.openModal("delegationModal"));
        this.actionBtn.addEventListener("click", () => this.openModal("actionModal"));
        this.closeHistoryBtn?.addEventListener("click", () => this.historyPanel.style.display = "none");

        // Delegation recipient search
        document.getElementById("delegationRecipient").addEventListener("input", (e) => {
            this.handleDelegationSearch(e.target.value);
        });

        // Modal event listeners
        document.querySelectorAll(".modal-close").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const modalId = e.target.dataset.modal;
                this.closeModal(modalId);
            });
        });

        document.querySelectorAll(".btn-cancel").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const modal = e.target.closest(".modal");
                this.closeModal(modal.id);
            });
        });

        document.getElementById("savDecisionBtn").addEventListener("click", () => this.handleSaveDecision());
        document.getElementById("savDelegationBtn").addEventListener("click", () => this.handleSaveDelegation());
        document.getElementById("savActionBtn").addEventListener("click", () => this.handleSaveAction());
    }

    startAlarmTimer() {
        // Trigger critical alarm after 10 seconds
        this.alarmTimeout = setTimeout(() => {
            this.triggerCriticalAlarm();
        }, 10000);
    }

    triggerCriticalAlarm() {
        // Create and display the critical alarm
        const alarm = mockDataHelpers.createCriticalAlarm();
        this.alarmTriggeredAt = new Date();

        // Create a case for this alarm
        const newCase = mockDataHelpers.createCase(
            "HPM-2400",
            "KRITISK: Temperaturöverkridning HPM-2400",
            "Automatisk eskalering - Maskinansvarig svarade inte i tid"
        );
        this.currentCaseId = newCase.caseId;

        // Switch to the ALARM conversation (HPM-2400 Sensor Bot) - must be conv_hpm_001
        const hpmConv = mockData.conversations.find(c => c.conversationId === "conv_hpm_001");
        if (!hpmConv) return; // Safety check

        this.currentConversationId = hpmConv.conversationId;
        newCase.conversationId = hpmConv.conversationId;

        // Mark conversation as critical
        hpmConv.priority = "critical";
        hpmConv.status = "escalated";
        hpmConv.alarmId = alarm.alarmId;
        hpmConv.caseId = newCase.caseId;
        hpmConv.lastActivity = new Date();

        // Add initial alarm message FROM THE BOT (not from user)
        mockDataHelpers.addMessage(
            this.currentConversationId,
            "bot_hpm",  // Message comes from the bot
            "alarm",
            `🚨 KRITISK ALARM: Temperaturöverkridning detekterad på HPM-2400.\n\nÄrende: ${newCase.caseId}\n\nSensor TEMP_01 rapporterar: 127°C (normal: 85°C)\nAvvikelse: +42°C\n\nÄROG: Maskinansvarig (Anna Bergström) kvitterade inte larmet inom 30 sekunder. Larmet har eskalerat till Maskingruppsansvarig.`,
            {
                alarmType: "TemperatureOverrun",
                level: 5,
                sensor: "TEMP_01",
                value: 127,
                unit: "°C",
                threshold: 85,
                escalatedBecause: "no_ack_timeout",
                escalatedFromRole: "Maskinansvarig",
                escalatedToRole: "Maskingruppsansvarig",
                caseId: newCase.caseId
            }
        );

        // Mark as unread since it's not from current user
        hpmConv.unreadCount = 1;

        // Play alarm sound
        this.playSound('alarm');

        // Start 30-second acknowledgement countdown
        this.startAcknowledgementCountdown();

        // Sort DM list and highlight the alarm
        this.renderDMList();

        // Only auto-show conversation if NOT in cases tab
        if (this.currentTab !== "cases") {
            // Show the conversation (don't mark as read, it's auto-opened)
            this.showConversation(this.currentConversationId, false);

            // Display alarm banner
            this.updateAlarmBanner();
        }
    }

    startAcknowledgementCountdown() {
        // 30 second countdown before next escalation
        this.acknowledgementCountdown = 30;

        // Clear any existing interval
        if (this.countdownInterval) clearInterval(this.countdownInterval);

        // Update countdown display immediately
        this.updateCountdownDisplay();

        // Update every second
        this.countdownInterval = setInterval(() => {
            this.acknowledgementCountdown--;
            this.updateCountdownDisplay();

            if (this.acknowledgementCountdown <= 0) {
                clearInterval(this.countdownInterval);
                this.acknowledgementCountdown = null;
            }
        }, 1000);
    }

    updateCountdownDisplay() {
        if (this.acknowledgementCountdown === null) return;

        // Find or create countdown element in alarm banner
        let countdownEl = document.querySelector(".alarm-countdown");

        if (!countdownEl && this.alarmBanner) {
            countdownEl = document.createElement("div");
            countdownEl.className = "alarm-countdown";
            this.alarmBanner.appendChild(countdownEl);
        }

        if (countdownEl) {
            const seconds = this.acknowledgementCountdown;
            const color = seconds <= 10 ? '#ffc600' : '#ffffff';

            countdownEl.innerHTML = `
                <div style="font-size: 1.2rem; font-weight: bold; color: ${color}; padding: 0.5rem 1rem; background: rgba(0,0,0,0.1); border-radius: 4px;">
                    ⏱️ ${seconds}s innan nästa eskalering
                </div>
            `;
        }
    }

    updateAlarmBanner() {
        if (!this.currentConversationId) return;

        const conv = mockDataHelpers.getConversationById(this.currentConversationId);
        if (conv && conv.priority === "critical") {
            this.alarmTitle.textContent = "KRITISK ESCALERING – HPM-2400";
            this.alarmMachine.textContent = "Sensor: TEMP_01 | Värde: 127°C (Normal: 85°C)";
            this.alarmReason.textContent = "Eskaleringsorsak: Maskinansvarig kvitterade inte larmet i tid → Eskalerat till Maskingruppsansvarig";
            this.alarmBanner.style.display = "flex";
            this.alarmBanner.setAttribute("role", "alert");
        } else {
            this.alarmBanner.style.display = "none";
        }
    }

    handleAcknowledge() {
        const conv = mockDataHelpers.getConversationById(this.currentConversationId);
        if (conv) {
            // Stop countdown
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }
            this.acknowledgementCountdown = null;

            // Mark alarm as acknowledged
            mockDataHelpers.addMessage(
                this.currentConversationId,
                this.currentUserId,
                "acknowledgment",
                "Larmet har mottagits och uppmärksammats.",
                {
                    acknowledgedAt: new Date(),
                    acknowledgedBy: mockDataHelpers.getUserById(this.currentUserId)?.name
                }
            );

            // Remove critical priority from conversation
            conv.priority = "normal";
            conv.status = "acknowledged";

            // Play acknowledged sound
            this.playSound('acknowledged');

            // Update UI
            this.updateAlarmBanner(); // Hide alarm banner and countdown
            this.renderMessages();
            this.renderDMList(); // Update DM list to remove red styling
        }
    }

    renderDMList() {
        this.dmList.innerHTML = "";

        // Sort conversations: critical alarms first, then by last activity
        const sorted = [...mockData.conversations].sort((a, b) => {
            if (a.priority === "critical" && b.priority !== "critical") return -1;
            if (a.priority !== "critical" && b.priority === "critical") return 1;
            return b.lastActivity - a.lastActivity;
        });

        sorted.forEach(conv => {
            const li = document.createElement("li");
            li.className = "dm-item";
            if (conv.priority === "critical") li.classList.add("alarm");
            if (this.currentConversationId === conv.conversationId) li.classList.add("active");

            const participants = mockDataHelpers.getConversationParticipants(conv.conversationId);
            const bot = participants.find(p => p.type === "bot");
            const user = participants.find(p => p.type === "human");

            // Determine icon and name
            let icon = "👤";
            let name = conv.title || "Unknown";

            if (bot) {
                icon = "🤖";
                name = conv.title || bot.name;
            } else if (user) {
                icon = "👤";
                name = conv.title || user.name;
            }

            li.innerHTML = `
                <div class="dm-item-icon-wrapper">
                    <div class="dm-item-icon">${icon}</div>
                    ${conv.unreadCount > 0 ? `<div class="dm-item-badge">${conv.unreadCount}</div>` : ""}
                </div>
                <div class="dm-item-content">
                    <div class="dm-item-name">${name}</div>
                    <div class="dm-item-preview">${conv.lastMessage}</div>
                    <div class="dm-item-meta">
                        ${this.formatTime(conv.lastActivity)}
                        ${conv.priority === "critical" ? '<span class="dm-item-meta"> • KRITISK</span>' : ''}
                    </div>
                </div>
            `;

            li.addEventListener("click", () => this.showConversation(conv.conversationId));
            this.dmList.appendChild(li);
        });
    }

    showConversation(conversationId, userInitiated = true) {
        this.currentConversationId = conversationId;
        const conv = mockDataHelpers.getConversationById(conversationId);

        if (!conv) return;

        // If conversation has a case, link to it
        if (conv.caseId) {
            this.currentCaseId = conv.caseId;
        } else {
            this.currentCaseId = null; // Clear case selection if no case
        }

        // Update UI
        this.noSelection.style.display = "none";
        this.conversationView.style.display = "flex";

        // Show chat elements again
        document.querySelector(".action-buttons").style.display = "flex";
        document.querySelector(".input-area").style.display = "flex";

        const participants = mockDataHelpers.getConversationParticipants(conversationId);
        const icons = participants.map(p => p.type === "bot" ? "🤖" : "👤").join(" ");
        const names = conv.title || participants.map(p => p.name).join(", ");

        this.conversationTitle.innerHTML = `
            <span>${icons}</span>
            <span>${names}</span>
        `;

        // Only mark as read if user manually opened it (not when alarm auto-opens)
        if (userInitiated) {
            conv.unreadCount = 0;
        }

        this.updateAlarmBanner();
        this.renderMessages();
        this.renderDMList(); // Render after marking as read

        // Clear input
        this.messageInput.value = "";
    }

    renderMessages() {
        this.messagesContainer.innerHTML = "";

        const messages = mockData.messages.filter(m => m.conversationId === this.currentConversationId);

        messages.forEach(msg => {
            const div = document.createElement("div");
            div.className = "message";

            const sender = mockDataHelpers.getUserById(msg.senderId) || mockDataHelpers.getBotById(msg.senderId);
            const isCurrentUser = msg.senderId === this.currentUserId;
            const isBot = sender?.type === "bot";

            // Right side: only if it's the current user. Left side: everyone else
            if (isCurrentUser) {
                div.classList.add("user");
            } else {
                div.classList.add("bot"); // Left side styling for all other senders
            }

            let content = `
                <div class="message-avatar">${isBot ? "🤖" : "👤"}</div>
                <div class="message-content">
            `;

            if (msg.type === "alarm") {
                content += `<strong>🚨 KRITISK ALARM</strong><br><pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px; background: #fff3cd; padding: 8px; border-radius: 4px; margin: 8px 0;">${msg.text}</pre>`;
                if (msg.metadata.escalatedBecause) {
                    content += `<small style="color: #d42426;"><strong>Eskalerad:</strong> ${msg.metadata.escaledFromRole} → ${msg.metadata.escalatedToRole} (${msg.metadata.escalatedBecause})</small>`;
                }
            } else if (msg.type === "decision") {
                const caseRef = msg.metadata.caseId ? ` • Ärende: ${msg.metadata.caseId}` : "";
                content += `<div class="event"><div class="event-type">💡 BESLUT</div><div class="event-content">${msg.text}</div><div class="event-meta">Beslutsfattare: ${msg.metadata.decisionMaker}${caseRef} • ${this.formatTime(msg.timestamp)}</div></div>`;
            } else if (msg.type === "delegation") {
                const caseRef = msg.metadata.caseId ? ` • Ärende: ${msg.metadata.caseId}` : "";
                content += `<div class="event"><div class="event-type">📋 DELEGERING</div><div class="event-content">${msg.text}</div><div class="event-meta">Till: ${msg.metadata.assignee}${caseRef} • Status: ${msg.metadata.status} • ${this.formatTime(msg.timestamp)}</div></div>`;
            } else if (msg.type === "action") {
                const caseRef = msg.metadata.caseId ? ` • Ärende: ${msg.metadata.caseId}` : "";
                content += `<div class="event"><div class="event-type">✓ ÅTGÄRD</div><div class="event-content">${msg.text}</div><div class="event-meta">Utförare: ${msg.metadata.performer}${caseRef} • Status: ${msg.metadata.status} • ${this.formatTime(msg.timestamp)}</div></div>`;
            } else if (msg.type === "bot_response") {
                content += `<strong>Bot Svar:</strong><br><small><strong>[DATA]</strong> ${msg.metadata.data}<br><strong>[TOLKNING]</strong> ${msg.metadata.interpretation}<br><strong>[REKOMMENDATION]</strong> ${msg.metadata.recommendation}</small>`;
            } else if (msg.type === "acknowledgment") {
                content += `<em>${msg.text}</em>`;
            } else {
                content += msg.text;
            }

            content += `<div class="message-time">${this.formatTime(msg.timestamp)}</div></div>`;

            div.innerHTML = content;
            this.messagesContainer.appendChild(div);
        });

        // Scroll to bottom
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    handleSendMessage() {
        const text = this.messageInput.value.trim();
        if (!text || !this.currentConversationId) return;

        // Add user message
        mockDataHelpers.addMessage(this.currentConversationId, this.currentUserId, "text", text);

        // Play sent sound
        this.playSound('sent');

        // Find the bot or colleague in this conversation
        const conv = mockDataHelpers.getConversationById(this.currentConversationId);
        const botId = conv?.participantIds?.find(id => mockData.bots.some(b => b.botId === id));
        const userId = conv?.participantIds?.find(id => mockData.users.some(u => u.userId === id && u.userId !== this.currentUserId));

        // Simulate bot response after a short delay
        setTimeout(() => {
            if (botId) {
                this.generateBotResponse(this.currentConversationId, botId, text);
                // Play notification sound when bot responds
                this.playSound('notification');
            } else if (userId === "usr_004") {
                // Lars (Underhållstekniker) responds after 3 seconds
                this.generateLarsResponse(this.currentConversationId);
                // Mark as unread
                conv.unreadCount = (conv.unreadCount || 0) + 1;
                // Play notification sound
                this.playSound('notification');
            }
            this.renderMessages();
            this.renderDMList(); // Refresh to show unread count
        }, botId ? 500 : 3000); // 3 seconds for Lars, 500ms for bots

        this.renderMessages();
        this.messageInput.value = "";
    }

    generateLarsResponse(conversationId) {
        // Random responses from Lars
        const responses = [
            "Jag kollar det nu, vänta ett ögonblick.",
            "Låter som ett tryckproblem. Jag börjar diagnostisera.",
            "Okej, jag är på väg till maskinen.",
            "Kan ta mig ungefär 10 minuter att komma dit.",
            "Har du någon mer info om när det började?",
            "Det här har jag sett förut. Vi fixar det.",
            "Är det HPM-2400 eller en annan maskin?",
            "Jag checkar loggarna nu.",
            "Låter brådskande. Jag prioriterar detta.",
            "Okej, jag har verktyg här. Kan börja omedelbar."
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];

        mockDataHelpers.addMessage(
            conversationId,
            "usr_004", // Lars
            "text",
            randomResponse
        );
    }

    generateBotResponse(conversationId, botId, userQuestion) {
        const lowerQuestion = userQuestion.toLowerCase();

        // Standard responses for common questions
        const responses = [
            // 1. Diagnos / vad är fel
            {
                keywords: ["vad", "fel", "problem", "varför", "diagnos"],
                data: "HPM-2400 mätutrustning rapporterar: Temperatur 127°C (överskridning +42°C), Tryck 52 bar (normal 50±2)",
                interpretation: "Sensorn detekterar en kritisk temperaturöverkridning. Detta indikerar möjlig värmeackumulering, bristande kylcirkulation eller överbelastning på systemet.",
                recommendation: "Prioritet: Stanna omedelbar drift. Inspektera: (1) Kylslangarna för blockering, (2) Fläkten för felaktighet, (3) Pumpen för läckage."
            },
            // 2. Historik / vad hände
            {
                keywords: ["historik", "hände", "tidigare", "förut", "idag"],
                data: "Logg från senaste 24h: Stabil drift 06:00-13:45. Vid 13:46 började temperatur att stiga. Når kritisk nivå 127°C vid 13:52.",
                interpretation: "Övergången var gradvis under ~6 minuter, vilket tyder på något som förvärrades kontinuerligt snarare än ett plötsligt fel.",
                recommendation: "Kontrollera om något gjordes på maskinen omkring 13:40 (justering, ändrad inställning, start av ny process)."
            },
            // 3. Åtgärd / vad ska göras
            {
                keywords: ["åtgärd", "gör", "hur", "ska", "behöva"],
                data: "Systemets self-check visar: Kylcirkulationen är aktiv men minskat flöde (normal 45 L/min, nu 18 L/min)",
                interpretation: "Det låga flödet förklarar värmeansamlingen. Möjlig orsak: blockering i filtret eller slang.",
                recommendation: "Omedelbar åtgärd: Rensa/byt värmeavvisningsfiltret. Uppskattat tidsåtgång 15 minuter. Testa sedan med reducerad belastning."
            },
            // 4. Sensor / mätutrustning
            {
                keywords: ["sensor", "mät", "givare", "värde", "läser"],
                data: "Temperaturgivaren (TEMP_01) är kalibrerad 2024-09-15. Senaste selftest: OK (2024-10-14 06:00). Noggrannhet: ±0.5°C",
                interpretation: "Givaren fungerar enligt specifikation. Värdet 127°C är därför tillförlitligt och inte ett sensorfel.",
                recommendation: "Förkasta teorin om givarvill. Felet ligger i den övervakade processen, inte i mätningen."
            },
            // 5. Risk / säkerhet / kan vi köra
            {
                keywords: ["risk", "säkerhet", "kan vi köra", "driva", "farligt"],
                data: "Driftgräns för HPM-2400 är 0-100°C. Aktuell nivå 127°C överskrider säker gräns med 27°C.",
                interpretation: "Fortsatt drift utgör risk för komponentskada, vätskeförlust och potentiell säkerhetshändelse.",
                recommendation: "REKOMMENDATION: Stanna omedelbar produktion. Påbörja felsökning av kylsystem innan återstart. Denna rekommendation är beslutsstöd för er säkerhetsledning."
            }
        ];

        // Find best matching response
        let selectedResponse = responses[4]; // Default to safety response
        for (let response of responses) {
            if (response.keywords.some(kw => lowerQuestion.includes(kw))) {
                selectedResponse = response;
                break;
            }
        }

        mockDataHelpers.createBotResponse(
            conversationId,
            botId,
            selectedResponse.data,
            selectedResponse.interpretation,
            selectedResponse.recommendation
        );
    }

    handleSaveDecision() {
        const text = document.getElementById("decisionText").value.trim();
        const caseId = document.getElementById("decisionCase").value.trim();

        if (!text) {
            alert("Var god ange en beslutsbeskrivning");
            return;
        }

        if (!caseId) {
            alert("Var god välj ett ärende");
            return;
        }

        mockDataHelpers.createDecisionEvent(this.currentConversationId, this.currentUserId, text, caseId);

        // Add decision to case
        mockDataHelpers.addDecisionToCase(caseId, this.currentUserId, text);

        this.renderMessages();
        this.closeModal("decisionModal");
        document.getElementById("decisionText").value = "";
        document.getElementById("decisionCase").value = "";

        // Show confirmation
        const confirmMsg = document.createElement("div");
        confirmMsg.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: #10b981; color: white; padding: 1rem; border-radius: 4px; z-index: 9999;";
        confirmMsg.textContent = `✓ Beslut sparat i ${caseId}`;
        document.body.appendChild(confirmMsg);
        setTimeout(() => confirmMsg.remove(), 2000);
    }

    handleSaveDelegation() {
        const recipientText = document.getElementById("delegationRecipient").value.trim();
        const taskText = document.getElementById("delegationTask").value.trim();
        const caseId = document.getElementById("delegationCase").value.trim();

        if (!recipientText || !taskText) {
            alert("Var god ange mottagare och uppgift");
            return;
        }

        if (!caseId) {
            alert("Var god välj ett ärende");
            return;
        }

        // Find the recipient
        const recipient = mockData.users.find(u => u.name.toLowerCase().includes(recipientText.toLowerCase()));
        if (!recipient) {
            alert("Mottagare inte hittad");
            return;
        }

        // 1. Add delegation event to current conversation (bot conversation)
        mockDataHelpers.createDelegationEvent(this.currentConversationId, this.currentUserId, recipient.userId, taskText, caseId);

        // Add delegation to case
        mockDataHelpers.addDelegationToCase(caseId, this.currentUserId, recipient.userId, taskText);

        this.renderMessages();

        // 2. Find or create recipient's DM conversation
        const recipientConv = mockData.conversations.find(c => c.participantIds.includes(recipient.userId));
        if (recipientConv) {
            // Add delegation event to recipient's DM conversation
            const caseRef = this.currentCaseId ? ` (${this.currentCaseId})` : "";
            mockDataHelpers.addMessage(
                recipientConv.conversationId,
                this.currentUserId,
                "delegation",
                `Delegering${caseRef}: ${taskText}`,
                {
                    delegationId: "dlg_" + Date.now(),
                    assignee: recipient.name,
                    delegatingUser: mockDataHelpers.getUserById(this.currentUserId)?.name || "Okänd",
                    status: "assigned",
                    delegationTime: new Date(),
                    caseId: this.currentCaseId
                }
            );

            // Simulate recipient's response after 5 seconds
            setTimeout(() => {
                mockDataHelpers.addMessage(
                    recipientConv.conversationId,
                    recipient.userId,
                    "text",
                    `Jag tar hand om detta omedelbart. Börjar inspektera loggen nu.`
                );
                // Mark as unread - increment count
                recipientConv.unreadCount = (recipientConv.unreadCount || 0) + 1;
                // Play notification sound for new DM
                this.playSound('notification');
                this.renderDMList(); // Update DM list to show new activity
            }, 5000);

            // Simulate recipient's action after 5 more seconds (10 seconds total)
            setTimeout(() => {
                mockDataHelpers.addMessage(
                    recipientConv.conversationId,
                    recipient.userId,
                    "text",
                    `Stannade produktionen. Har påbörjat felsökning av kylsystem. Återkommer.`
                );

                // Create action event in the case
                if (this.currentCaseId) {
                    mockDataHelpers.addActionToCase(
                        this.currentCaseId,
                        recipient.userId,
                        "Stannade produktionen. Har påbörjat felsökning av kylsystem. Återkommer.",
                        "started"
                    );
                }

                // Mark as unread
                recipientConv.unreadCount = (recipientConv.unreadCount || 0) + 1;
                this.playSound('notification');
                this.renderMessages();
                this.renderDMList();
            }, 10000);
        }

        this.closeModal("delegationModal");
        document.getElementById("delegationRecipient").value = "";
        document.getElementById("delegationTask").value = "";
        document.getElementById("delegationCase").value = "";

        // Show confirmation
        const confirmMsg = document.createElement("div");
        confirmMsg.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: #0066cc; color: white; padding: 1rem; border-radius: 4px; z-index: 9999;";
        confirmMsg.textContent = `✓ Delegering sparad i ${caseId}`;
        document.body.appendChild(confirmMsg);
        setTimeout(() => confirmMsg.remove(), 2000);
    }

    handleSaveAction() {
        const description = document.getElementById("actionDescription").value.trim();
        const status = document.getElementById("actionStatus").value;
        const caseId = document.getElementById("actionCase").value.trim();

        if (!description) {
            alert("Var god ange en åtgärdsbeskrivning");
            return;
        }

        if (!caseId) {
            alert("Var god välj ett ärende");
            return;
        }

        mockDataHelpers.createActionEvent(this.currentConversationId, this.currentUserId, description, status, caseId);

        // Add action to case
        mockDataHelpers.addActionToCase(caseId, this.currentUserId, description, status);

        this.renderMessages();
        this.closeModal("actionModal");
        document.getElementById("actionDescription").value = "";
        document.getElementById("actionCase").value = "";

        // Show confirmation
        const confirmMsg = document.createElement("div");
        confirmMsg.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: #d42426; color: white; padding: 1rem; border-radius: 4px; z-index: 9999;";
        confirmMsg.textContent = `✓ Åtgärd sparad i ${caseId}`;
        document.body.appendChild(confirmMsg);
        setTimeout(() => confirmMsg.remove(), 2000);
    }

    handleDelegationSearch(query) {
        const resultsDiv = document.getElementById("delegationResults");
        const results = [];

        if (query.trim().length === 0) {
            // Show all colleagues when empty
            results.push(...mockData.users);
        } else {
            // Filter by name or role
            results.push(...mockData.users.filter(u =>
                u.name.toLowerCase().includes(query.toLowerCase()) ||
                u.role.toLowerCase().includes(query.toLowerCase())
            ));
        }

        resultsDiv.innerHTML = "";

        if (results.length === 0) {
            resultsDiv.innerHTML = "<div class='search-result-item'>Ingen match</div>";
            return;
        }

        results.forEach(user => {
            const div = document.createElement("div");
            div.className = "search-result-item";
            div.innerHTML = `<strong>${user.name}</strong><br><small>${user.role}</small>`;
            div.style.cursor = "pointer";
            div.addEventListener("click", () => {
                document.getElementById("delegationRecipient").value = user.name;
                resultsDiv.innerHTML = "";
            });
            resultsDiv.appendChild(div);
        });
    }

    populateCaseSelects() {
        const selectIds = ["decisionCase", "delegationCase", "actionCase"];

        selectIds.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;

            // Keep the default option, remove others
            select.innerHTML = '<option value="">-- Välj ärende --</option>';

            // Sort cases by createdAt (newest first)
            const sortedCases = [...mockData.cases].sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );

            sortedCases.forEach(caseObj => {
                const option = document.createElement("option");
                option.value = caseObj.caseId;
                option.textContent = `${caseObj.caseId} - ${caseObj.title} (${caseObj.status})`;
                select.appendChild(option);
            });
        });
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add("active");
            modal.style.display = "flex";

            // Populate case selects
            this.populateCaseSelects();

            // If delegation modal, show all colleagues
            if (modalId === "delegationModal") {
                this.handleDelegationSearch("");
            }

            // Focus on first select/input
            const firstInput = modal.querySelector("select, input, textarea");
            if (firstInput) firstInput.focus();
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("active");
            modal.style.display = "none";
        }
    }

    handleReset() {
        clearTimeout(this.alarmTimeout);
        mockDataHelpers.resetDemo();
        this.currentConversationId = null;
        this.currentCaseId = null;
        this.alarmTriggeredAt = null;
        this.noSelection.style.display = "flex";
        this.conversationView.style.display = "none";
        this.alarmBanner.style.display = "none";
        this.messagesContainer.innerHTML = "";
        this.messageInput.value = "";

        // Remove newly created cases (keep only the mock ones)
        mockData.cases = mockData.cases.filter(c => c.caseId.startsWith("CASE-00"));

        this.renderDMList();
        if (this.currentTab === "cases") {
            this.renderCasesList();
        }
        this.startAlarmTimer();
    }

    toggleHistory() {
        if (this.historyPanel.style.display === "none") {
            this.historyPanel.style.display = "block";
            this.historyToggleBtn.textContent = "📋 Dölj Historik";
        } else {
            this.historyPanel.style.display = "none";
            this.historyToggleBtn.textContent = "📋 Historik";
        }
    }

    showSettings() {
        alert("Inställningar:\n\n🏭 Maskinpark Meddelandehub v1.0\n\nDemonstrationssystem för AI DM HUB\n\nAlla data är mockad och fiktiv.\n\nKnappbeskrivningar:\n📋 Historik – Visa/dölj meddelande-historiken\n↻ Återställ Demo – Kör demonstrationsscenariot om\n⚙️ Inställningar – Visa systeminfo");
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

        // Update tab content
        document.querySelectorAll(".tab-content").forEach(panel => panel.classList.remove("active"));
        if (tabName === "messages") {
            this.messagesPanel.classList.add("active");
        } else {
            this.casesPanel.classList.add("active");
            this.renderCasesList();
        }
    }

    renderCasesList() {
        this.casesList.innerHTML = "";

        // Sort cases by created date (newest first)
        const sorted = [...mockData.cases].sort((a, b) => b.createdAt - a.createdAt);

        sorted.forEach(caseObj => {
            const li = document.createElement("li");
            li.className = "dm-item";
            if (caseObj.status === "open") li.classList.add("alarm");
            if (this.currentCaseId === caseObj.caseId) li.classList.add("active");

            const statusEmoji = caseObj.status === "open" ? "🔴" : "✅";

            li.innerHTML = `
                <div class="dm-item-icon-wrapper">
                    <div class="dm-item-icon">${statusEmoji}</div>
                </div>
                <div class="dm-item-content">
                    <div class="dm-item-name">${caseObj.caseId}</div>
                    <div class="dm-item-preview">${caseObj.title}</div>
                    <div class="dm-item-meta">
                        ${this.formatTime(caseObj.createdAt)}
                        ${caseObj.status === "open" ? '<span class="dm-item-meta"> • ÖPPEN</span>' : ''}
                    </div>
                </div>
            `;

            li.addEventListener("click", () => this.showCaseDetails(caseObj.caseId));
            this.casesList.appendChild(li);
        });
    }

    showCaseDetails(caseId) {
        this.currentCaseId = caseId;
        const caseObj = mockDataHelpers.getCaseById(caseId);
        if (!caseObj) return;

        this.noSelection.style.display = "none";
        this.conversationView.style.display = "flex";

        // Hide chat elements - show only case details
        this.alarmBanner.style.display = "none";
        document.querySelector(".action-buttons").style.display = "none";
        document.querySelector(".input-area").style.display = "none";

        this.conversationTitle.innerHTML = `
            <span>📋</span>
            <span>${caseObj.caseId} - ${caseObj.title}</span>
        `;

        this.renderCaseContent(caseObj);
        this.renderCasesList();
    }

    renderCaseContent(caseObj) {
        this.messagesContainer.innerHTML = "";

        const machine = mockDataHelpers.getMachineById(caseObj.machineId);
        const createdDate = new Date(caseObj.createdAt).toLocaleString("sv-SE");
        const closedDate = caseObj.closedAt ? new Date(caseObj.closedAt).toLocaleString("sv-SE") : "-";

        // Case header - Corporate style
        const header = document.createElement("div");
        header.className = "case-header";
        header.innerHTML = `
            <div class="case-header-title">
                <span class="case-id">${caseObj.caseId}</span>
                <span class="case-status ${caseObj.status}">${caseObj.status === "open" ? "🔴 ÖPPEN" : "✅ LÖST"}</span>
                <span class="case-priority priority-${caseObj.priority}">${caseObj.priority.toUpperCase()}</span>
            </div>
            <h2>${caseObj.title}</h2>
        `;
        this.messagesContainer.appendChild(header);

        // Info table
        const infoTable = document.createElement("table");
        infoTable.className = "case-info-table";
        infoTable.innerHTML = `
            <tr>
                <td class="label">Maskin:</td>
                <td><strong>${machine?.name || caseObj.machineId}</strong> (${caseObj.machineId})</td>
                <td class="label">Maskingrupp:</td>
                <td>${machine?.group || "-"}</td>
            </tr>
            <tr>
                <td class="label">Skapad:</td>
                <td>${createdDate}</td>
                <td class="label">Stängd:</td>
                <td>${closedDate}</td>
            </tr>
            <tr>
                <td class="label">Ansvarig:</td>
                <td>${caseObj.assignedTo ? mockDataHelpers.getUserById(caseObj.assignedTo)?.name : "-"}</td>
                <td class="label">Larm-ID:</td>
                <td>${caseObj.alarmIds.join(", ") || "-"}</td>
            </tr>
        `;
        this.messagesContainer.appendChild(infoTable);

        // Timeline section
        const timeline = document.createElement("div");
        timeline.className = "case-timeline";

        // Collect all events
        const events = [];

        caseObj.decisions.forEach(d => {
            events.push({
                type: "decision",
                timestamp: d.timestamp,
                icon: "💡",
                title: "BESLUT",
                actor: d.maker,
                description: d.text
            });
        });

        caseObj.delegations.forEach(d => {
            events.push({
                type: "delegation",
                timestamp: d.timestamp,
                icon: "📋",
                title: "DELEGERING",
                actor: `${d.from} → ${d.to}`,
                description: d.task,
                status: d.status
            });
        });

        caseObj.actions.forEach(a => {
            events.push({
                type: "action",
                timestamp: a.timestamp,
                icon: "✓",
                title: "ÅTGÄRD",
                actor: a.performer,
                description: a.text,
                status: a.status
            });
        });

        // Sort events by timestamp
        events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (events.length === 0) {
            const emptyMsg = document.createElement("div");
            emptyMsg.style.cssText = "padding: 2rem; text-align: center; color: #999;";
            emptyMsg.innerHTML = "<em>Ingen aktivitet än på detta ärende</em>";
            timeline.appendChild(emptyMsg);
        } else {
            const timelineTitle = document.createElement("h3");
            timelineTitle.style.cssText = "margin-top: 1.5rem; margin-bottom: 1rem; color: #333;";
            timelineTitle.textContent = "Tidslinje & Aktivitet";
            timeline.appendChild(timelineTitle);

            events.forEach((event, idx) => {
                const eventEl = document.createElement("div");
                eventEl.className = `timeline-event event-${event.type}`;
                eventEl.innerHTML = `
                    <div class="timeline-dot">${event.icon}</div>
                    <div class="timeline-content">
                        <div class="event-header">
                            <span class="event-type">${event.title}</span>
                            <span class="event-actor">${event.actor}</span>
                            ${event.status ? `<span class="event-status">${event.status}</span>` : ""}
                            <span class="event-time">${new Date(event.timestamp).toLocaleTimeString("sv-SE")}</span>
                        </div>
                        <div class="event-description">${event.description}</div>
                    </div>
                </div>
                ${idx < events.length - 1 ? '<div class="timeline-connector"></div>' : ""}
                `;
                timeline.appendChild(eventEl);
            });
        }

        this.messagesContainer.appendChild(timeline);
        this.messagesContainer.scrollTop = 0;
    }

    formatTime(date) {
        if (!date) return "";
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (seconds < 60) return "Nu";
        if (minutes < 60) return `${minutes} min`;
        if (hours < 24) return `${hours}h`;
        return new Date(date).toLocaleDateString("sv-SE");
    }
}

// Initialize the app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    window.app = new AIHubApp();
});
