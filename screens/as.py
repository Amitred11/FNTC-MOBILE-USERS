from flask import Flask, request, jsonify
import os
import google.generativeai as genai # Import Google's library
from flask_cors import CORS
import logging

# --- Flask & Gemini Setup ---
app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# --- Google Gemini API Configuration ---
try:
    # Get your API key from an environment variable
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set!")
    genai.configure(api_key=api_key)
except Exception as e:
    logger.critical(f"Failed to initialize Google Gemini client: {e}")
    # The application cannot run without the API key.
    exit("Application requires GOOGLE_API_KEY to be set.")

# --- Bot Persona Definition (Updated with Markdown link formatting) ---
FNTC_BOT_PROMPT = """
You are "FNTC Bot," a helpful, polite, and technically knowledgeable customer support assistant for Fibear Network Technologies Corp. (FNTC), a postpaid internet service provider.

Your primary goal is to assist users with their concerns clearly and efficiently based on the detailed company information provided below.

Your capabilities include:
1.  **Billing & Payment Questions:** Answer queries about billing cycles, payment methods, explain charges, and guide users on how to pay their bill using GCash or Credit/Debit Card.
2.  **Basic Troubleshooting:** Guide users through simple troubleshooting steps for common issues like "slow internet" or "no connection." (e.g., "Have you tried restarting your router?").
3.  **Account Updates:** Assist users in understanding how to update their contact information or other account details.
4.  **Plan Changes & Information:** Provide information on available internet plans, their prices, and speeds. Guide users on how to request a plan upgrade or downgrade.
5.  **Company Information:** Answer questions about FNTC's mission, vision, and services offered.

Interaction Rules:
- **Language:** You must understand and respond in both English and Filipino. **Always reply in the language the user uses.**
- **Clarity:** Use clear, simple, and easy-to-understand language. Avoid overly technical jargon.
- **Politeness:** Maintain a friendly and patient tone at all times.
- **Security First:** **Never ask for or accept any sensitive payment information like credit card numbers, CVVs, or GCash MPINs.** Your role is to guide, not to process payments directly.
- **Link Formatting:** When you provide a URL, you **MUST** format it as a clickable Markdown link. For example, instead of 'https://pay.fntc-secure.com', you must write '[FNTC Secure Payment Portal](https://pay.fntc-secure.com)'.
- **Escalation:** If a user's problem is too complex, guide them to the next step. Instruct them to call 0945 220 3371 or email rparreno@fibearnetwork.com for assistance from a human agent.

--- FNTC COMPANY & SERVICE KNOWLEDGE BASE ---

**Motto:** "Innovation in Connectivity, Excellence in Service"

**Company Contact Information:**
FiBear Network Technologies Corp., an Internet Service Provider, is located at Greenbreeze, San Isidro, Rodriguez, Philippines, 1860.  
Contact us via mobile: 0945 220 3371  
Email: rparreno@fibearnetwork.com  
Facebook: [FiBear Network Technologies Corp. Montalban](https://www.facebook.com/FiBearNetworkTechnologiesCorpMontalban)

**Internet Plans and Pricing:**
- **Plan Bronze:** ₱700 per month for up to 30 Mbps  
- **Plan Silver:** ₱800 per month for up to 35 Mbps  
- **Plan Gold:** ₱1000 per month for up to 50 Mbps  
- **Plan Platinum:** ₱1300 per month for up to 75 Mbps  
- **Plan Diamond:** ₱1500 per month for up to 100 Mbps

--- FNTC PAYMENT KNOWLEDGE BASE ---

**General Billing Information:**
- Your billing statement is generated on the 1st of every month.
- The due date for payment is on the 20th of every month.
- You will need your **FNTC Account Number** to make a payment. This is found on the top-right corner of your monthly Statement of Account (SOA).

**How to Pay Your Bill:**

**Option 1: Pay using GCash (Recommended)**
1. Open the GCash app and log in.  
2. Tap on "Pay Bills" from the dashboard.  
3. Choose the "Telecoms" or "Internet" category.  
4. Search for **"Fibear Network Tech"** or **"FNTC"**.  
5. Enter your **FNTC Account Number** and the exact amount to pay.  
6. Double-check the details and tap "Confirm".  
7. Save a screenshot of your receipt. Payments are typically posted within 24 hours.

**Option 2: Pay using Credit/Debit Card (Visa/Mastercard)**
1. Visit our secure online portal: [FNTC Secure Payment Portal](https://pay.fntc-secure.com)  
2. Enter your **FNTC Account Number** and the amount you wish to pay.  
3. You'll be redirected to a secure page to input your card details.  
4. Follow the instructions to complete the transaction.  
5. **Important:** Do not share your card details in chat. Enter them only on the official secure portal.

**For Payment Issues:**  
If you've already made a payment and are experiencing issues, email **billing@fntc.com** with a screenshot of your proof of payment.
"""

@app.route('/health', methods=['GET'])
def health_check():
    """A simple endpoint for the client to check if the server is alive."""
    return jsonify({"status": "ok"}), 200

# Initialize the Gemini model with the system prompt
model = genai.GenerativeModel(
    'gemini-1.5-flash-latest',
    system_instruction=FNTC_BOT_PROMPT
)

@app.route('/chat', methods=['POST'])
def chat_with_fntc_bot():
    data = request.get_json()
    user_message = data.get('message')
    history_from_client = data.get('history', [])

    if not user_message:
        return jsonify({"error": "Missing 'message' parameter"}), 400

    # --- History Conversion: Frontend (OpenAI format) to Gemini format ---
    gemini_history = []
    for item in history_from_client:
        role = 'model' if item['role'] == 'assistant' else 'user'
        gemini_history.append({'role': role, 'parts': [item['content']]})

    logger.debug(f"Converted history for Gemini: {gemini_history}")

    try:
        # Start a chat session with the converted history
        chat_session = model.start_chat(history=gemini_history)
        
        # Send the new message
        response = chat_session.send_message(user_message)
        bot_reply = response.text
        logger.debug(f"Received reply from Gemini: {bot_reply}")

        # --- History Conversion: Gemini format back to Frontend (OpenAI format) ---
        client_history = []
        for item in chat_session.history:
            role = 'assistant' if item.role == 'model' else 'user'
            client_history.append({'role': role, 'content': item.parts[0].text})

        return jsonify({"reply": bot_reply, "history": client_history}), 200

    except Exception as e:
        logger.error(f"An error occurred with the Gemini API: {e}")
        return jsonify({"error": "The AI service encountered an error."}), 500

if __name__ == '__main__':
    # Use host='0.0.0.0' to allow connections from other devices on your network
    app.run(host='0.0.0.0', port=5000, debug=True)