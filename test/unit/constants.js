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
 
// constants defined in schemas
 
/*
if (!Cc)
  const Cc = Components.classes;
if (!Ci)
  const Ci = Components.interfaces;
if (!Cu)
  const Cu = Components.utils;
*/

const kSchemaTypes = ['None', 'Simple', 'Complex', 'Placeholder']

const kFacetTypes =  ['NONE', 'LENGTH', 'MINLENGTH', 'MAXLENGTH',
                      'PATTERN', 'ENUMERATION', 'WHITESPACE', 'MAXINCLUSIVE',
                      'MININCLUSIVE', 'MAXEXCLUSIVE', 'MINEXCLUSIVE', 'TOTALDIGITS',
                      'FRACTIONDIGITS'];
const kBuiltinTypes = [
   'NONE' // =0 placeholder
  ,'ANYTYPE' // =1;
  ,'STRING' // =2;
  ,'NORMALIZED_STRING' // =3;
  ,'TOKEN' // =4;
  ,'BYTE' // =5;
  ,'UNSIGNEDBYTE' // =6;
  ,'BASE64BINARY' // =7;
  ,'HEXBINARY' // =8;
  ,'INTEGER' // =9;
  ,'POSITIVEINTEGER' // =10;
  ,'NEGATIVEINTEGER' // =11;
  ,'NONNEGATIVEINTEGER' // =12;
  ,'NONPOSITIVEINTEGER' // =13;
  ,'INT' // =14;
  ,'UNSIGNEDINT' // =15;
  ,'LONG' // =16;
  ,'UNSIGNEDLONG' // =17;
  ,'SHORT' // =18;
  ,'UNSIGNEDSHORT' // =19;
  ,'DECIMAL' // =20;
  ,'FLOAT' // =21;
  ,'DOUBLE' // =22;
  ,'BOOLEAN' // =23;
  ,'TIME' // =24;
  ,'DATETIME' // =25;
  ,'DURATION' // =26;
  ,'DATE' // =27;
  ,'GMONTH' // =28;
  ,'GYEAR' // =29;
  ,'GYEARMONTH' // =30;
  ,'GDAY' // =31;
  ,'GMONTHDAY' // =32;
  ,'NAME' // =33;
  ,'QNAME' // =34;
  ,'NCNAME' // =35;
  ,'ANYURI' // =36;
  ,'LANGUAGE' // =37;
  ,'ID' // =38;
  ,'IDREF' // =39;
  ,'IDREFS' // =40;
  ,'ENTITY' // =41;
  ,'ENTITIES' // =42;
  ,'NOTATION' // =43;
  ,'NMTOKEN' // =44;
  ,'NMTOKENS' // =45;
];

const kComplexModels = ['NONE', 'EMPTY', 'SIMPLE', 'ELEMENT_ONLY', 'MIXED'];

const kComplexDerivations = ['NONE', 'EXTENSION_SIMPLE', 'RESTRICTION_SIMPLE',
                             'EXTENSION_COMPLEX', 'RESTRICTION_COMPLEX',
                             'SELF_CONTAINED'];

const kSimpleTypes = ['NONE', 'BUILTIN', 'LIST', 'UNION', 'RESTRICTION'];

const kModelCompositors = ['NONE', 'ALL', 'SEQUENCE', 'CHOICE'];

const kParticleTypes = ['NONE', 'PARTICLE_TYPE_ELEMENT', 'MODEL_GROUP', 'ANY'];

const kComponentTypes = ['NONE', 'ATTRIBUTE', 'GROUP', 'ANY'];
