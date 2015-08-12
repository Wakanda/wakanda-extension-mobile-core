Make your Studio extension in less than 2 minutes
=======================================

Here are the instructions to make your first Wakanda extension in less than 2 minutes by following these 7 steps:

1. Download and unzip the Extension Template in the extension folder:
	On Windows: {Disk}:\Users\{User name}\AppData\Roaming\Wakanda Studio\Extensions
	On Mac OS: /Users/{User name}/Library/Application Support/Wakanda Studio/Extensions
2. Open manifest.json in a text editor and define your extension name by replacing YOUR_EXTENSION_NAME.
3. Replace YOUR_EXTENSION_DESCRIPTION with a brief description of your extension.
4. Define your extension action name by replacing YOUR_ACTION in manifest.json.
5. Replace YOUR_ACTION_TITLE in manifest.json with an easy-to-understand title.
6. Open index.js in a code editor and replace YOUR_ACTION to rename the action.
7. Write the function body in index.js to define your action.

Voilà! Restart your Wakanda Studio and you will see your first extension appear in the main toolbar. You can place your extension icon/menu in other places - in manifest.json, just replace "studioToolbar" with another valid value (please refer to the online documentation: http://doc.wakanda.org/Wakanda-Studio/help/Title/en/page2982.html).

A good example illustrates the whole picture better than detailed documentation. You can check the Wakanda Studio Extension Demo to learn how to make certain commands more complex. 

However, knowledge of Wakanda Studio Extension System is required if you want to accomplish sophisticated extensions. Check the Wakanda Studio Extension online document for more detailed information:
http://doc.wakanda.org/Wakanda-Studio/help/Title/en/page2974.html

You can use the Wakanda Studio Extension development forum for any technical questions/answers and for the announcement your new extension:
http://forum.wakanda.org/forumdisplay.php?27-Studio-Extensions
