/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is MesQuilla code.
 *
 * The Initial Developer of the Original Code is
 * Kent James <kent@caspia.com>.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
 
// utilities used in SOAP testing

load('constants.js');
 
function showType(aType)
{
  // make sure it is a type
  if ( !(aType instanceof Ci.msqISchemaType) )
  {
    dl('not a type: ' + aType);
    return;
  }
  dl('**showing type <' + aType.name + '>');
  dl('  type schemaType ' + kSchemaTypes[aType.schemaType]);
  /*
  showInterfaces(aType, ["msqISchemaComponent",
                         "msqISchemaType",
                         "msqISchemaSimpleType",
                         "msqISchemaBuiltinType",
                         "msqISchemaListType",
                         "msqISchemaUnionType",
                         "msqISchemaRestrictionType",
                         "msqISchemaComplexType"]);
  /**/
  // restriction type
  if (aType instanceof Ci.msqISchemaRestrictionType)
  {
    dl('  showing baseType');
    showType(aType.baseType);
    dl('  facet count ' + aType.facetCount);
    for (let i = 0; i < aType.facetCount; i++)
    {
      let facet = aType.getFacet(i);
      dl('    facet type: ' + kFacetTypes[facet.facetType]);
      try { dl('    facet value: ' + facet.value); } catch(e) {}
      try { dl('    facet lengthValue: ' + facet.lengthValue); } catch(e) {}
      try { dl('    facet digitsValue: ' + facet.digitsValue); } catch(e) {}
      if (kFacetTypes[facet.facetType] == 'WHITESPACE')
        try { dl('    facet whitespaceValue: ' + facet.whitespaceValue); } catch(e) {}
      try {
        if (facet.isFixed)
          dl('    facet is fixed');
      } catch(e) {}
    }
  }

  // builtin type
  if (aType instanceof Ci.msqISchemaBuiltinType)
    dl('  builtin type is ' + kBuiltinTypes[aType.builtinType]);

  // complex type
  if (aType instanceof Ci.msqISchemaComplexType)
  {
    dl('  complex model is ' + kComplexModels[aType.contentModel]);
    dl('  complex derivation is ' + kComplexDerivations[aType.derivation]);
    if (aType.baseType)
      dl('  complex baseType name is ' + aType.baseType.name);
    if (aType.simpleBaseType)
      dl('  complex simple base type is ' + kSimpleTypes[aType.simpleBaseType.simpleType]);

    let modelGroup = aType.modelGroup;
    if (modelGroup)
      showModelGroup(modelGroup);
    dl('  complex attribute count is ' + aType.attributeCount);
    for (let i = 0; i < aType.attributeCount; i++)
    {
      let attributeComponent = aType.getAttributeByIndex(i);
      dl('    attribute <' + attributeComponent.name + '> is type ' + kComponentTypes[attributeComponent.componentType]);
      if (attributeComponent instanceof Ci.msqISchemaAttribute)
        dl('    attribute is simple type ' + kSimpleTypes[attributeComponent.type.simpleType]);
      else if (attributeComponent instanceof Ci.msqISchemaAttributeGroup)
        dl('    attribute component is a group with ' + attributeComponent.attributeCount + ' attributes');
    }
    if (aType.abstract)
      dl('  complex is abstract');
    if (aType.isArray)
      dl('  complex is array');
  }

  // list type
  if (aType instanceof Ci.msqISchemaListType)
  {
    dl('  type is list, showing list type');
    showType(aType.listType);
  }
}

function showParticle(particle)
{
  dl('**showing particle<' + particle.name +
     '>(' + particle.minOccurs +
     ',' + (particle.maxOccurs == Ci.msqISchemaParticle.OCCURRENCE_UNBOUNDED ? -1 : particle.maxOccurs) +
     ') type is ' + kParticleTypes[particle.particleType]);
  if (particle.particleType == Ci.msqISchemaParticle.PARTICLE_TYPE_ELEMENT)
    showElement(particle.QueryInterface(Ci.msqISchemaElement));
  else if (particle.particleType == Ci.msqISchemaParticle.PARTICLE_TYPE_MODEL_GROUP)
    showModelGroup(particle.QueryInterface(Ci.msqISchemaModelGroup));
}

function showElement(element)
{
  dl('**showing element<' + element.QueryInterface(Ci.msqISchemaParticle).name + '>');
  let defaultValue = element.defaultValue;
  if (defaultValue && defaultValue.length)
    dl('element defaultValue is ' + defaultValue);
  let fixedValue = element.fixedValue;
  if (fixedValue && fixedValue.length)
    dl('element fixedValue is ' + fixedValue);
  if (element.nillable)
    dl('element is nillable');
  if (element.abstract)
    dl('element is abstract');
  dl('element type:');
  showType(element.type);
}

function showModelGroup(modelGroup)
{
  dl('**showing modelGroup <' + modelGroup.QueryInterface(Ci.msqISchemaParticle).name + '>');
  dl('  complex model group compositor is ' + kModelCompositors[modelGroup.compositor]);
  dl('  complex model group particle count is ' + modelGroup.particleCount);
  for (let i = 0; i < modelGroup.particleCount; i++)
  {
    dl('**showing model group particle ' + i )
    showParticle(modelGroup.getParticle(i));
  }
}

function showInterfaces(aObject, aPossibleInterfaces)
{
  for (var iface of aPossibleInterfaces)
  {
    if (aObject instanceof Ci[iface])
      dl('  interface ' + iface);
  }
}

function getFileURL(aLocalFile)
{
  var fileurl = Cc["@mozilla.org/network/io-service;1"]
                  .getService(Ci.nsIIOService)
                  .newFileURI(aLocalFile)
                  .QueryInterface(Ci.nsIFileURL);
  return fileurl.spec;
}

function* testFacet(facet, facetData)
{
  Assert.equal(facetData.facetType,
              kFacetTypes[facet.facetType]);
  if (facetData.value)
    Assert.equal(facetData.value, facet.value);
}

function* testType(type, typeData)
{
  Assert.ok(type instanceof Ci.msqISchemaType);
  if (typeData.schemaType)
    Assert.equal(kSchemaTypes[type.schemaType], typeData.schemaType);
  if (typeData.iface)
    Assert.ok(type instanceof Ci[typeData.iface]);
  if (typeData.simpleType)
  {
    Assert.ok(type instanceof Ci.msqISchemaSimpleType);
    Assert.equal(typeData.simpleType, kSimpleTypes[type.simpleType]);
  }

  if (typeData.builtinType)
  {
    Assert.ok(type instanceof Ci.msqISchemaBuiltinType);
    Assert.equal(typeData.builtinType,
                kBuiltinTypes[type.builtinType]);
  }

  if (typeData.baseType)
    Assert.equal(typeData.baseType, type.baseType.name);

  if (typeData.facets)
  {
    Assert.ok(type instanceof Ci.msqISchemaRestrictionType);
    //let baseType = type.baseType;
    // if we define facets, then we want to make sure that the lengths match
    Assert.equal(typeData.facets.length, type.facetCount)
    for (let j = 0; j < type.facetCount; j++)
    {
      let facet = type.getFacet(j);
      let facetData = typeData.facets[j];
      testFacet(facet, facetData);
    }
  }

  if (typeData.listType)
    Assert.equal(typeData.listType, type.listType.name);

  if (typeData.attributes)
    for (let attributeName of typeData.attributes)
      Assert.ok(type.getAttributeByName(attributeName) instanceof Ci.msqISchemaAttributeComponent);

  if (typeData.contentModel)
    Assert.equal(typeData.contentModel, kComplexModels[type.contentModel]);

  if (typeData.modelGroupData)
  {
    Assert.ok(type instanceof Ci.msqISchemaComplexType)
    testModelGroup(type.modelGroup, typeData.modelGroupData);
  }
}

function* testModelGroup(modelGroup, modelGroupData)
{
  Assert.ok(modelGroup instanceof Ci.msqISchemaModelGroup)
  if (modelGroupData.particleCount || modelGroupData.particleCount == 0)
    Assert.equal(modelGroup.particleCount, modelGroupData.particleCount);
}

function* testElement(element, elementData)
{
  Assert.ok(element instanceof Ci.msqISchemaElement);
  if (elementData.nillable)
    Assert.equal(element.nillable, (elementData.nillable == 'true'));
  if (elementData.typeData)
    testType(element.type, elementData.typeData);
}

function* testAttribute(aAttribute, aAttributeData)
{

}

function showAttribute(aAttribute)
{
  dl('attribute name is ' + aAttribute.name);
}

function dumpXMLResponse(aElement) {
  try {
  var serializer = Cc["@mozilla.org/xmlextras/xmlserializer;1"]
                     .createInstance(Ci.nsIDOMSerializer);
  if (aElement instanceof Ci.nsIDOMDocument)
    var element = aElement.documentElement;
  else
    var element = aElement;
  // var prettyText = XML(serializer.serializeToString(element)).toXMLString();
  var prettyText = serializer.serializeToString(element);
  dump(prettyText);
  dump('\n');
  } catch (e)
  {
    dump(e + '\n');
    dl('element is ' + element);
    if (element instanceof Ci.nsIDOMDocument)
      dl('documentElement is ' + element.documentElement.nodeName);
    dl('nodeName: <' + element.nodeName + '>');
    let nodeList = element.childNodes;
    for (let i = 0; i < nodeList.length; i++)
      dl('child <' + nodeList[i].nodeName + '>');
  }
}

function* testNode(node, nodeData)
{
  Assert.ok(node instanceof Ci.nsIDOMNode);
  if (!nodeData)
    return;
  if (nodeData.localName)
    Assert.equal(nodeData.localName, node.localName);
  if (nodeData.namespaceURI)
    Assert.equal(nodeData.namespaceURI, node.namespaceURI);

  if (nodeData.textData)
  {
    let childNodes = node.childNodes;
    isFound = false;
    for (let i = 0; i < childNodes.length; i++)
    {
      if (childNodes[i] instanceof Ci.nsIDOMCharacterData)
      {
        Assert.equal(nodeData.textData, childNodes[i].data);
        isFound = true;
        break;
      }
    }
    Assert.ok(isFound);
  }

  if (nodeData.attributes)
  {
    for (var attributeData of nodeData.attributes)
    {
      let attribute = node.getAttributeNS(attributeData.namespaceURI, attributeData.localName);
      // interface now gone: Assert.ok(attribute instanceof Ci.nsIDOMAttr);
      // for the value, strip away a possible leading namespace prefix
      let value = attribute.value;
      let colon = value.indexOf(':');
      if (colon != -1)
        value = value.slice(colon + 1);
      Assert.equal(value, attributeData.value);
    }
  }

  if (nodeData.children)
  {
    let childNodes = node.childNodes;
    let childNodesDataArray = nodeData.children;
    for (let i = 0; i < childNodes.length; i++)
    {
      let childNode = childNodes[i];
      let childNodeData = childNodesDataArray[i];
      testNode(childNode, childNodeData);
    }
  }
}

/* Convert a property list into an array like this:
  [
    ['firstName', 'firstValue],
    ['firstname/firstsubname', 'firstname-firstsubname-value'],
    ['secondName', 'secondValue']
  ];
*/
 
function normalizePropertyList(aList, aNormalizedList, aPrefix)
{
  if (!(safeInstanceOf(aList, Ci.msqIPropertyList)))
  {
    dl('aList not a property list, it is :' + aList);
    return;
  }

  let prefix = "";
  if (typeof aPrefix != 'undefined' && aPrefix != "")
    prefix = aPrefix + '/';

  // I use index instead of enumerate to pickup attributes
  let length = aList.length;
  for (let i = 0; i < length; i++)
  {
    let property = aList.getValueAt(i);
    let name = aList.getNameAt(i);
    if (safeInstanceOf(property, Ci.msqIPropertyList))
      normalizePropertyList(property, aNormalizedList, prefix + name);
    else
    {
      let element = [];
      element[0] = prefix + name;
      element[1] = property;
      aNormalizedList.push(element);
    }
  }
}

// loop through the property list, testing a map of the data tree
function* testPropertyList(aList, aListData)
{
  dl('testing property list');
  let normalObject = [];
  normalizePropertyList(aList, normalObject);
  for (testCount = 0; testCount < aListData.length; testCount ++)
  {
    let name = aListData[testCount][0];
    let value = aListData[testCount][1];
    Assert.equal(name, normalObject[testCount][0]);
    Assert.equal(value, normalObject[testCount][1]);
  }
}

/* from http://javascript.crockford.com/remedial.html
function typeOf(value) {
    var s = typeof value;
    if (s === 'object') {
        if (value) {
            if (typeof value.length === 'number' &&
                    !(value.propertyIsEnumerable('length')) &&
                    typeof value.splice === 'function') {
                s = 'array';
            }
        } else {
            s = 'null';
        }
    }
    return s;
}
/**/

// get the first message header found in a folder
function firstMsgHdr(folder) {
  let enumerator = folder.msgDatabase.EnumerateMessages();
  if (enumerator.hasMoreElements())
    return enumerator.getNext().QueryInterface(Ci.nsIMsgDBHdr);
  return null;
}

// returns the content of a file specified by string url
function fileUrlText(url)
{
  let file = Services.io.newURI(url, null, null)
                        .QueryInterface(Ci.nsIFileURL)
                        .file;
  return nsIFileText(file);
}
  
// returns the text content of a file, for example filename = "data/resolutionset.xml"
function fileText(filename) {
  var file = do_get_file(filename);
  return nsIFileText(file);
}

function nsIFileText(file)
{
  var data = "";
  var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                          .createInstance(Components.interfaces.nsIFileInputStream);
  var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                          .createInstance(Components.interfaces.nsIScriptableInputStream);
  fstream.init(file, -1, 0, 0);
  sstream.init(fstream); 

  //pull the contents of the file out
  var str = sstream.read(4096);
  while (str.length > 0) {
    data += str;
    str = sstream.read(4096);
  }

  sstream.close();
  fstream.close();

  return data;
};

